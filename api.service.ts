import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  // private baseUrl = 'https://aot-api.vercel.app';

  private jsonUrl = 'assets/exams.json';

  constructor(
    private http: HttpClient) { }


//   getQuotes(): Observable<any>{
//     return this.http.get(`${this.baseUrl}/quote`);
// }

  getExams(){
    return this.http.get<any>(this.jsonUrl);
  }



}
