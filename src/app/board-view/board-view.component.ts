
import { Component, OnInit, ViewChild } from '@angular/core';
import { ProjectService } from '../service/project.service';
import { CdkDragDrop, CdkDragStart, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Project, Task } from '../../assets/Project';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { UserService } from '../service/user.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ProjectComponent } from '../project/project.component';
import { TaskComponent } from '../task/task.component';
import { MatSidenav } from '@angular/material/sidenav';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../service/notification.service';
import { EditTaskComponent } from '../edit-task/edit-task.component';
import { ConfirmmessageComponent } from '../confirmmessage/confirmmessage.component';
import html2canvas from 'html2canvas';


@Component({
  selector: 'app-board-view',
  templateUrl: './board-view.component.html',
  styleUrls: ['./board-view.component.css']
})
export class BoardViewComponent implements OnInit {
  isSidenavOpen: boolean = true;
  projectDetails: any | Project;
  currentCardTaskStatus: any;
  projectList: any;
  // ---------------------------------------------
  constructor(private projectService: ProjectService, private http: HttpClient, private noti: NotificationService,
    private snackBar: MatSnackBar, private routing: Router, private user: UserService, private dialog: MatDialog) { }
  notifications: any = {};

  ngOnInit(): void {

    let val = this.projectService.getProjectName();
  

    this.user.getProjectList().subscribe(
      response => {
        this.projectList = response;
        // if ((val === null || typeof val === 'undefined') && (this.projectList.projectList.length > 0)) {
        // let val = this.projectService.getProjectName();
        this.user.getProjectList().subscribe(
          response => {
            this.projectList = response;
            if (val === null || typeof val === 'undefined') {
              val = this.projectList.projectList[0];
            }
            this.projectService.setProjectName(val);
            this.projectService.getProject(val).subscribe(
              response => {
                this.projectDetails = response;
                this.projectService.setProjectDetails(this.projectDetails.columns["Work In Progress"])
                this.getNotification();
              },
              error => console.log("There was error fetching Project Details")
            )
          },
          error => {
            console.log(error);
          }
        );
      }
      // }
    )
    this.getNotification();
  }

  showL: boolean = true;

  showList() {
    this.showL = !this.showL;
  }
  searchText: string = '';
  clearSearch() {
    this.searchText = '';
    this.search();
  }

  search() {
    let val = this.projectService.getProjectName();
    this.user.getProjectList().subscribe(
      response => {
        this.projectList = response;
        if (val == null) {
          console.log("test");
          val = this.projectList.projectList[0];
          console.log(val);
        }
        this.projectService.setProjectName(val);
        this.projectService.getProject(val).subscribe(
          response => {
            this.projectDetails = response;
            for (let col of Object.entries(this.projectDetails.columns)) {
              let [name, arr] = col as any;
              console.log(name);
              arr = arr.filter((task: Task) => {
                return task.name.startsWith(this.searchText)
              })
              console.log(arr);
              this.projectDetails.columns[name] = arr
            }
          },
          error => alert("There was error fetching Project Details")
        )
      },
      error => {
        console.log(error);
      }
    );
  }

  getKey(data: any) {
    for (let col of Object.entries(this.projectDetails.columns)) {
      let [name, arr] = col as any;
      if (arr == data) {
        return name
      }
    }
  }

  drop(event: CdkDragDrop<Task[]>) {
    this.getThePriorityTasks();

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      if (this.getKey(event.container.data) == 'Work In Progress' && !this.getNumberOfTaskInWIP()) {
        this.openSnackBar("WIP limit reached", "OK")
        return;
      }
      if (this.getKey(event.container.data) == 'Work In Progress' && this.getThePriorityTasks()) {
        this.openSnackBar("Only Priority task can be added", "OK")
        return;
      }
      if(event.previousContainer.data[0].status=="To Be Done"&&this.getKey(event.container.data) == 'Completed'){
        this.openSnackBar("Can't Move directly from To Be Done to completed","OK")
        return;
      }
      if(event.previousContainer.data[0].status!==null&&this.getKey(event.container.data) == 'To Be Done'){
        this.openSnackBar("Not Allowed","OK")
        return;
      }
      let initial=this.getColumnIndex(event.previousContainer.data[0].status);
      let final=this.getColumnIndex(this.getKey(event.container.data));

      if ((final-initial>=2) || (initial-final>=2)) {
        this.openSnackBar("Kindly don't skip any step", "OK");
        return;
      }
      transferArrayItem(
        event.previousContainer.data,
        event.container.data as Task[],
        event.previousIndex,
        event.currentIndex
      );
    }
    console.log(this.projectDetails);

    this.projectService.updateProject(this.projectDetails).subscribe(
      response => {
        console.log(response);
      },
      error => {
        alert("There was error updating the project");
        console.log(error);
      }
    )
  }

  getColumnIndex(columnName:any){

    if (this.projectDetails && this.projectDetails.columns) {
      let arrayData =Object.keys(this.projectDetails.columns);
      return arrayData.indexOf(columnName);
    }
    return 0;
  }
  sortName() {
    for (let col of Object.entries(this.projectDetails.columns)) {
      let [name, arr] = col as any;
      console.log(arr);
      arr = arr.sort((a: any, b: any) => {
        let fa = a.name.toLowerCase(), fb = b.name.toLowerCase();
        if (fa < fb) {
          return -1;
        }
        if (fa > fb) {
          return 1;
        }
        return 0;
      })
      console.log(arr);
    }
  }
  sortPriority() {
    for (let col of Object.entries(this.projectDetails.columns)) {
      let [name, arr] = col as any;
      console.log(arr);
      const order: any = { Urgent: 0, High: 1, Normal: 2, Low: 3, Clear: 4 };
      console.log(order['Low']);
      arr = arr.sort((a: any, b: any) =>
        order[a.priority] - order[b.priority]
      )
      console.log(arr);
    }
  }

  notificationSize: number = 0;
  notificationArray: any;
  getNotification() {
    this.noti.getNotification().subscribe(
      response => {
        this.notifications = response;
        this.notificationSize = this.notifications.notificationMessage;
        let i = 0;
        for (let msg of Object.entries(this.notifications.notificationMessage)) {
          let [noti, flag] = msg as any;
          if (flag == false)
            i += 1
        }
        this.notificationSize = i;
        const notiArray = Object.entries(this.notifications.notificationMessage);
        notiArray.sort((key, value) => {
          if (key[1] === value[1]) {
            return 0;
          } else if (key[1] === false) {
            return -1;
          } else {
            return 1;
          }
        });
        this.notificationArray = notiArray;
      },
      error => {
        alert("Failed to get notification")
      }
    )
  }

  readAll() {
    this.noti.readAllNotifications().subscribe(
      response => {
        console.log("Read all msgs");
        this.getNotification()
      },
      error => {
        alert("Read Notifications Failed")
      }
    )
  }
  readMsg(msg: any) {
    this.noti.readNotifications(msg).subscribe(
      response => {
        console.log("Read msgs");
        this.getNotification()
      },
      error => {
        alert("Read Notification Failed")
      }
    )
  }
  dateToString(date: any) {
    let hoursDiff = date.getHours() - date.getTimezoneOffset() / 60;
    let minutesDiff = (date.getHours() - date.getTimezoneOffset()) % 60;
    date.setHours(hoursDiff);
    date.setMinutes(minutesDiff);

    let dateString = JSON.stringify(date)
    dateString = dateString.slice(1, 11);
    return dateString;
  }

  getColumnNames() {
    if (this.projectDetails && this.projectDetails.columns) {
      return Object.keys(this.projectDetails.columns);
    }
    return [];
  }

  getColumnTasks(columnName: string) {
    
      for (let i = 0; i < this.projectDetails.columns[columnName].length; i++) {
        if(this.projectDetails.columns[columnName][i].status!=='Archived'){
        this.projectDetails.columns[columnName][i].status = columnName;
      }
    }
    return this.projectDetails.columns[columnName];
  }
  // ------------------------------methods for manipulation of content drag and drop
  getNumberOfTaskInWIP(): boolean {
    let num = this.projectDetails.columns["Work In Progress"].length
    return num <= 4;
  }

  getThePriorityTasks() {
    let urgent = 0;
    for (let i = 0; i < this.projectDetails.columns["To Be Done"].length; i++) {
      if (this.projectDetails.columns["To Be Done"][i].priority == "Urgent") {
        urgent++;
      }
    }
    if (urgent > 2 && this.currentCardTaskStatus != "Urgent") {

      return true;
    } else {

      return false;
    }
  }

  onDragStart(task: any) {
    this.currentCardTaskStatus = task.priority;
  }
  deleteProject(project: any) {
    this.projectService.confirmMsg = "dlt";
    const dialog = this.dialog.open(ConfirmmessageComponent);
    dialog.afterClosed().subscribe(result => {
      if (this.projectService.confirmdlt) {
        this.user.deleteProject(project).subscribe(
          response => {
            this.projectService.projectName = null;
            this.openSnackBar("The project was deleted Successfully", "OK")
            this.routing.navigateByUrl('/', { skipLocationChange: true }).then(() => {
              this.routing.navigate(['/boardView']);
            });
            this.projectService.confirmdlt = false;
          },
          error => {
            this.openSnackBar("There was error deleting the project", "OK")
          }
        )
      }
    })
  }

  delete(columnName: any, task: any) {

    alert(task.status)
    for (let i = 0; i < this.projectDetails.columns[columnName].length; i++) {
      if (this.user.currentUser !== task.assignee) {
        if (this.projectDetails.columns[columnName][i].name == task.name && columnName == 'Completed') {
          this.projectDetails.columns[columnName][i].status = 'Archived'
          // this.projectDetails.columns[columnName].splice(i, 1);
          this.openSnackBar("The task was deleted successfully", "OK")
          break;
        }
        else {
          this.openSnackBar("Task can only be removed from COmpleted ", "OK")
        }
      } else {
        if (this.projectDetails.columns[columnName][i].name == task.name) {
          this.projectDetails.columns[columnName][i].status = 'Archived'
          // this.projectDetails.columns[columnName].splice(i, 1);
          this.openSnackBar("The task was deleted successfully", "OK")
          break;
        }
      }
    }
    alert(task.status)
    this.projectService.updateProject(this.projectDetails).subscribe(

      response => {
        console.log(response);
      },
      error => {
        alert("There was error updating the project");
        console.log(error);

      }
    )
  }

  // ------------------------------------u---------------------------------------
  openSnackBar(message: string, action: string) {
    this.snackBar.open(message, action, { duration: 3000 });
    // this.routing.navigate(['/project']);
  }

  show: boolean = false;
  load(date: any) { return date?.slice(8, 10); }

  loadA(assigne: any) { return assigne?.slice(0, 1); }

  hide() { this.show = false; }

  unhide(task: any) { this.show = true; }


  // ----------------------------

  projectDialog: any;
  projectWindow() {
    this.projectDialog = this.dialog.open(ProjectComponent);
    this.projectService.closeBoxForProject = false;
  }

  ngDoCheck() {
    if (this.projectService.closeBoxForProject) {
      this.projectDialog.close();
    }
  }

  // ----------------------------------

  taskWindow() {
    let dialogConfig = new MatDialogConfig();
    dialogConfig.position = { top: '-50px' };
    this.dialog.open(TaskComponent);
  }
  editTask(task: any) {
    this.projectService.editTask = task;
    this.dialog.open(EditTaskComponent);
  }
  // -------------------------
  isShowing: boolean = false;

  @ViewChild('sidenav', { static: true }) sidenav!: MatSidenav;

  toggleSidenav() {
    this.sidenav.toggle();
    this.isSidenavOpen = !this.isSidenavOpen;

  }
  callMethods() {
    this.toggleSidenav();
  }

  // boardView(project: string) {
  //   this.projectService.setProjectName(project);
  //   this.projectService.getProject(project).subscribe(
  //     response => {
  //       this.projectDetails = response;
  //     },
  //     error => alert("There was error fetching Project Details")
  //   )
  // }
  boardView(project: string) {
    this.projectService.setProjectName(project);
    this.projectService.getProject(project).subscribe(
      response => {
        this.projectDetails = response;
        this.projectService.setProjectDetails(this.projectDetails.columns["Work In Progress"])
      },
      error => alert("There was error fetching Project Details")
    )
  }

  getColorClass(value: string): string {
    if (value === 'Urgent') {
      return 'card-red';
    } else if (value === 'High') {
      return 'card-yellow';
    } else if (value === 'Low') {
      return 'card-grey';
    } else if (value === 'Normal') {
      return 'card-blue';
    } else {
      return '';
    }
  }
  selectedProject(project: string): string {
    if (this.projectService.projectName == project) {
      return 'bold'
    }
    return 'projectButton'
  }
  seenUnseen(flag: any): string {
    if (flag == false) {
      return 'notiSeen';
    }
    else {
      return 'notiUnSeen'
    }
  }

  download() {
    const element = document.getElementsByClassName('kanban-main')[0] as HTMLElement;
    if (element) {
      html2canvas(element).then((canvas) => {
        const link = document.createElement('a');
        link.href = canvas.toDataURL();
        link.download = 'screenshot.png';
        link.click();
      });
    } else {
      console.error('Element not found');
    }
  }
  shareBoard() {

    const ss = document.getElementsByClassName('kanban-main')[0] as HTMLElement;
    if (ss) {
      html2canvas(ss).then(canvas => {
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'workflo_screenshot.png', { type: blob?.type })
            if (navigator.share) {
              navigator.share({
                title: 'Workflo.com share',
                files: [file],
              })
            }
          }
        }, 'image/png');
      });
    }
    else {
      alert("No element")
    }

  }
  taskArchive:boolean=false;
  getTaskStatus(status:any){
    if(status=='Archived'){
      return this.taskArchive;
    }
    return !this.taskArchive;
  }
  toggleArchive(){
    this.taskArchive=!this.taskArchive
  }

  changeColumnName(event: any, columnName: any) {
    for (let col of Object.entries(this.projectDetails.columns)) {
      let [name, arr] = col as any;
      console.log(name);

      if (name == columnName && name !== 'To Be Done' && name !== 'Work In Progress' && name !== 'Completed') {
        const newName = event.target.innerText;
        delete this.projectDetails.columns[columnName];
        this.projectDetails.columns[newName] = arr;
        this.projectService.updateProject(this.projectDetails).subscribe(
          response => {
            console.log(response);
          },
          error => {
            alert("There was error updating the project");
            console.log(error);
          }
        )
      }
    }
    console.log(this.projectDetails.columns);
  }
  addColumn() {
    let i = 0;
    for (let col of Object.entries(this.projectDetails.columns)) {
      let [name, arr] = col as any;
      if (name == 'New Column') {
        this.openSnackBar("Column with same name exists", "Ok")
      }
      i += 1;
    }
    console.log(i);
    if (i < 6) {
      this.projectDetails.columns['New Column'] = [];
      this.projectService.updateProject(this.projectDetails).subscribe(
        response => {
          console.log(response);
        },
        error => {
          alert("There was error updating the project");
          console.log(error);
        }
      )
    }
    else {
      this.openSnackBar("Cannot add any more Columns", "Ok")
    }
  }
  deleteColumn(columnName: any) {
    let arr = this.projectDetails.columns[columnName]
    if (arr.length > 0) {
      this.openSnackBar("Cannot delete Columns with Tasks", "Ok")
    }
    else {
      delete this.projectDetails.columns[columnName];
    }
    this.projectService.updateProject(this.projectDetails).subscribe(
      response => {
        console.log(response);
      },
      error => {
        alert("There was error updating the project");
        console.log(error);
      }
    )
  }
  canEditCol: boolean = false
  columnNameChangeable(columnName: any) {
    if (columnName == 'To Be Done' || columnName == 'Work In Progress' || columnName == 'Completed') {
      return false;
    }
    else {
      return this.canEditCol;
    }
  }
  editableCol() {
    this.canEditCol = !this.canEditCol;
  }

}