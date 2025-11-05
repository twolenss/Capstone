import { Component, OnInit } from '@angular/core';
import { ApiService } from '../api.service';
import { SubjectGroup } from '../subject-code';
import { DepartmentGroup } from '../subject-code';

@Component({
  selector: 'app-conflict',
  templateUrl: './conflict.component.html',
  styleUrls: ['./conflict.component.scss']
})
export class ConflictComponent implements OnInit {

  startDate: Date | null = null;
  generatedDates: string[] = [];
  exams: any[] = [];
  subjectId
  // generatedSchedule: any[] = [];
  // uniqueDepartments: Exam[] = [];

  // rooms = Array.from({ length: 81 }, (_, i) => `Room ${i + 1}`);
  // days = ['Day 1', 'Day 2', 'Day 3'];
  // timeSlots: string[] = [
  //   '7:30-9:00',
  //   '9:00-10:30',
  //   '10:30-12:00',
  //   '12:00-1:30',
  //   '1:30-3:00',
  //   '3:00-4:30',
  //   '4:30-6:00',
  //   '6:00-7:30'
  // ];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
     this.loadExams();
  }
  loadExams() {
    this.api.getExams().subscribe({
      next: (res) => {
        // The file structure has { message, data: [...] }
        this.exams = res.data.map(item => ({
          code: item.codeNo,
          subjectId: item.subjectId,
          title: item.subjectTitle,
          course: item.course,
          dept: item.dept,
          day: item.day,
          time: item.time,
          room: item.roomNumber,
          year: item.yearLevel
      }));
          console.log('Imported Exams:', this.exams);
      
        this.exams = this.getUniqueSubjectIds(res.data);
        console.log('Grouped Subject IDs:', this.exams);
    
      },
      error: (err) => {
        console.error('Error loading exams:', err);
      }
    });
  }


  date() {

    const dayCount = 3;
    const currentDate = new Date(this.startDate);
    this.generatedDates = [];

    for (let i = 0; i < dayCount; i++) {
      this.generatedDates.push(currentDate.toDateString());
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  getUniqueSubjectIds(data: any[]): SubjectGroup[] {
    const groupedID: SubjectGroup[] = [];
      data.forEach(item => {
      const existing = groupedID.find(s => s.subjectId === item.subjectId);

      if (existing) {
        existing.codes.push({
          codeNo: item.codeNo,
          course: item.course,
          year: item.yearLevel,
          dept: item.dept

        });
      } else {
        groupedID.push({
          subjectId: item.subjectId,
          subjectTitle: item.subjectTitle,
          codes: [{
            codeNo: item.codeNo,
            course: item.course,
            year: item.yearLevel,
            dept: item.dept
          }]
        });
      }
    });
    return groupedID;
  }



//   generateExamSchedule() {
//   const schedule: any[] = [];
//   let dayIndex = 0;
//   let timeIndex = 0;
//   let roomIndex = 0;

//   const usedSlots: any = {};

//   for (const exam of this.exams) {
//     // assign current slot
//     const scheduleItem = {
//       codeNo: exam.code,
//       subject: exam.title,
//       subjectId: exam.subjectId,
//       course: exam.course,
//       room: this.rooms[roomIndex],
//       day: this.days[dayIndex],
//       time: this.timeSlots[timeIndex]
//     };

//     schedule.push(scheduleItem);

//     // move to next slot
//     roomIndex++;
//     if (roomIndex >= this.rooms.length) {
//       roomIndex = 0;
//       timeIndex++;
//     }

//     if (timeIndex >= this.timeSlots.length) {
//       timeIndex = 0;
//       dayIndex++;
//     }

//     // Reset back to first day if all days used
//     if (dayIndex >= this.days.length) {
//       dayIndex = 0;
//     }
//   }

//   this.generatedSchedule = schedule;
//   console.log('Generated Exam Schedule:', this.generatedSchedule);
// }
                                                                                                              

}
