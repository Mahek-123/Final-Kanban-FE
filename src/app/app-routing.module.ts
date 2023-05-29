import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { ProjectComponent } from './project/project.component';
import { BoardViewComponent } from './board-view/board-view.component';
import { TaskComponent } from './task/task.component';
import { AuthGuardGuard } from './service/auth-guard.guard';
import { CanDeactivatedTeam } from './service/can-deactivate-guard.guard';
import { HomepageComponent } from './homepage/homepage.component';

const routes: Routes = [
  {path:'', component:HomepageComponent},
  // {path:'', redirectTo:'/login', pathMatch:'full'},
  {path:'login', component:LoginComponent},
  {path:'register', component:RegisterComponent,  canDeactivate:[CanDeactivatedTeam] },
  {path:'project', component:ProjectComponent},
  {path:'boardView', component:BoardViewComponent, canActivate:[AuthGuardGuard] }
  // {path:'boardView', component:BoardViewComponent }
];
// ,
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
