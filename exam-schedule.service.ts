import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Rooms } from '../subject-code';
export interface ExamDay {
  date: Date | null;
  am: boolean;
  pm: boolean;
}

export interface ExamGroup {
  name: string;
  days: ExamDay[];
}
@Injectable({
  providedIn: 'root'
})
export class ExamScheduleService {

  private examDatesKey = 'examDates';
  private studentMappingKey = 'studentMapping';
  private roomMappingKey = 'roomAssignments';
  private selectedExamGroupKey = 'selectedExamGroup'; // NEW
  private roomSummaryKey = 'roomSummary';

  // Live data streams
  private examDatesSource = new BehaviorSubject<any[]>(this.loadFromStorage(this.examDatesKey) || []);
  examDates$ = this.examDatesSource.asObservable();

  private finalSubjectListSource = new BehaviorSubject<any[]>([]);
  finalSubjectList$ = this.finalSubjectListSource.asObservable();

  private codeSummary = new BehaviorSubject<any[]>(
    this.loadFromStorage(this.roomSummaryKey) || []);
  api$ = this.codeSummary.asObservable();


  // NEW: selected exam group
  private selectedExamGroupSource = new BehaviorSubject<ExamGroup | null>(
    this.loadFromStorage(this.selectedExamGroupKey)
  );
  selectedExamGroup$ = this.selectedExamGroupSource.asObservable();

  constructor() {}

  // Generic Local Storage Helper
  private loadFromStorage(key: string): any {
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private saveToStorage(key: string, value: any) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  setFinalSubjectList(subjects: any[]) {
    this.finalSubjectListSource.next(subjects);
    this.setStudentMapping(subjects);
  }
  getRoomSummary(data: Rooms[]) {
    this.saveToStorage(this.roomSummaryKey, data);
    this.codeSummary.next(data);
  }
   getRoomSummaryData(): any[] {
    return this.loadFromStorage(this.roomSummaryKey) || [];
  }
  setExamDates(dates: ExamDay[]) {
    this.saveToStorage(this.examDatesKey, dates);
    this.examDatesSource.next(dates);
  }

  getExamDates(): ExamDay[] {
    return this.loadFromStorage(this.examDatesKey) || [];
  }

  clearExamDates() {
    localStorage.removeItem(this.examDatesKey);
    this.examDatesSource.next([]);
  }
  setStudentMapping(data: any) {
    this.saveToStorage(this.studentMappingKey, data);
  }

  getStudentMapping() {
    return this.loadFromStorage(this.studentMappingKey);
  }

  clearStudentMapping() {
    localStorage.removeItem(this.studentMappingKey);
  }
  setRoomMapping(data: any) {
    this.saveToStorage(this.roomMappingKey, data);
  }

  getRoomMapping() {
    return this.loadFromStorage(this.roomMappingKey);
  }

  clearRoomMapping() {
    localStorage.removeItem(this.roomMappingKey);
  }
  setSelectedExamGroup(group: ExamGroup) {
    this.saveToStorage(this.selectedExamGroupKey, group);
    this.selectedExamGroupSource.next(group);
  }

  getSelectedExamGroup(): ExamGroup | null {
    return this.loadFromStorage(this.selectedExamGroupKey) || this.selectedExamGroupSource.value;
  }

  clearSelectedExamGroup() {
    localStorage.removeItem(this.selectedExamGroupKey);
    this.selectedExamGroupSource.next(null);
  }
  // ✅ NEW METHOD: Clear all exam schedule data
  clearAllExamScheduleData() {
    localStorage.removeItem(this.examDatesKey);
    localStorage.removeItem(this.studentMappingKey);
    localStorage.removeItem(this.roomMappingKey);
    localStorage.removeItem(this.selectedExamGroupKey);
    // Note: Don't clear roomSummaryKey as it's API data, not schedule data
    
    // Reset BehaviorSubjects
    this.examDatesSource.next([]);
    this.finalSubjectListSource.next([]);
    
    console.log('✅ Cleared all exam schedule data from localStorage');
  }
}
