import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { ApiService } from '../../../../api.service';
import { GlobalService } from '../../../../global.service';
import { map } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { SubjectGroup, DepartmentGroup, ProgramSchedule } from '../../../../subject-code';
import { MatDialog } from '@angular/material';
import { DatePickerComponent } from '../date-picker/date-picker.component';
import { ExamScheduleService } from '../../../../services/exam-schedule.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-student-mapping',
  templateUrl: './student-mapping.component.html',
  styleUrls: ['./student-mapping.component.scss']
})

export class StudentMappingComponent implements OnInit, OnDestroy {

  rawCodes: any[] = [];
  codes: any[] = [];
  subjectId: string;
  programsAll: ProgramSchedule[] = [];
  programs: ProgramSchedule[] = [];

  activeTerm: string;
  startDate: Date | null = null;
  selectedDates: string[] = [];
  daysWithTimeSlots: { [day: string]: string[] } = {};
  existingDates: any[] = [];

  showTable = false;

  termOptions = [
    { key: 1, value: '1st Term' },
    { key: 2, value: '2nd Term' },
    { key: 3, value: 'Summer' },
  ];

  combinedOptions: { label: string, value: string }[] = [];
  departments: DepartmentGroup[] = [];
  swal = Swal;
  prevSelection: { [fullSlot: string]: string } = {};
  selectedScheduleOutput: any[] = [];

  private examDatesSubscription: Subscription;

  constructor(
    public api: ApiService, 
    public global: GlobalService, 
    private dialog: MatDialog,  
    private sharedData: ExamScheduleService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    
    this.existingDates = this.sharedData.getExamDates();
    this.combineYearTerm();
    
    if (this.existingDates && this.existingDates.length) {
      this.loadExamDatesFromService(this.existingDates);
    } else {
      console.log(" No existing dates found or dates array is empty");
    }
    
    // Subscribe to exam dates changes for future updates
    this.examDatesSubscription = this.sharedData.examDates$.subscribe((dates) => {
      if (dates && dates.length) {
        this.loadExamDatesFromService(dates);
      } else {
        console.log("Subscription fired but no dates or empty array");
      }
    });

    // Load any saved student mapping
    const storedSchedule = this.sharedData.getStudentMapping();
    if (storedSchedule && storedSchedule.length) {
      this.selectedScheduleOutput = storedSchedule;
      this.showTable = true;
    }
    
  }

  ngOnDestroy() {
    if (this.examDatesSubscription) {
      this.examDatesSubscription.unsubscribe();
    }
  }

  loadExamDatesFromService(dates: any[]) {
    const AM_SLOTS = ['7:30 AM - 9:00 AM', '9:00 AM - 10:30 AM', '10:30 AM - 12:00 PM'];
    const PM_SLOTS = ['12:00 PM - 1:30 PM', '1:30 PM - 3:00 PM', '3:00 PM - 4:30 PM', '4:30 PM - 6:00 PM', '6:00 PM - 7:30 PM'];

    this.selectedDates = [];
    this.daysWithTimeSlots = {};


    dates.forEach((d: any) => {
      const key = new Date(d.date).toLocaleDateString('en-CA');
      this.selectedDates.push(key);

      // Determine time slots based on AM/PM flags
      if (d.am && d.pm) {
        this.daysWithTimeSlots[key] = [...AM_SLOTS, ...PM_SLOTS];
      } else if (d.am) {
        this.daysWithTimeSlots[key] = [...AM_SLOTS];
      } else if (d.pm) {
        this.daysWithTimeSlots[key] = [...PM_SLOTS];
      }
    });

    console.log("Loaded selectedDates:", this.selectedDates);
    console.log("Loaded daysWithTimeSlots:", this.daysWithTimeSlots);

    if (this.programsAll.length > 0) {
      this.initializeProgramSchedules();
    }

    this.cdr.detectChanges();
  }


  initializeProgramSchedules() {
    for (const p of this.programsAll) {
      if (!p.schedule) p.schedule = {};
      
      for (const dateStr of this.selectedDates) {
        const slots = this.daysWithTimeSlots[dateStr] || [];
        for (const slot of slots) {
          const full = `${dateStr}_${slot}`;
          if (typeof p.schedule[full] === 'undefined') {
            p.schedule[full] = '';
          }
        }
      }
    }
  }

  combineYearTerm() {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 2; y <= currentYear + 1; y++) {
      const nextYear = y + 1;
      for (const t of this.termOptions) {
        const label = `${t.value} ${y}-${nextYear}`;
        const value = `${y}${nextYear.toString().slice(-2)}${t.key}`;
        this.combinedOptions.push({ label, value });
      }
    }
  }

  selectTermYear() {
    if (!this.activeTerm) {
      this.global.swalAlertError("Please select term");
      return;
    }

    this.showTable = false;

    console.log("Selected Term Code:", this.activeTerm);
    this.loadSwal();
    this.getCodeSummaryReport(this.activeTerm);
  }

  getCodeSummaryReport(sy) {
    this.api.getCodeSummaryReport(sy)
      .map((response: any) => response.json())
      .subscribe(
        res => {
          this.rawCodes = res.data;
          Swal.close();
          this.sharedData.getRoomSummary(res.data);
          this.codes = this.getUniqueSubjectIds(res.data);
          this.programsAll = this.getUniqueProgramsAll(res.data);
          this.programs = this.programsAll.filter(p => !(p.dept && p.dept.toUpperCase() === 'SAS'));

          for (const p of this.programsAll) {
            if (!p.schedule) p.schedule = {};
            p.remainingSubjects = this.getRemainingSubjects(p);
          }

          // Initialize schedules if we have dates
          if (this.selectedDates.length > 0) {
            this.initializeProgramSchedules();
          }

          this.updateSelectedScheduleOutput();
          console.log("Programs Loaded:", this.programsAll);
        },
        err => this.global.swalAlertError(err)
      );
  }

  getUniqueSubjectIds(data: any[]): SubjectGroup[] {
    const groupedID: SubjectGroup[] = [];
    for (const item of data) {
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
          units: Number(item.lecUnits) || 0,
          codes: [{
            codeNo: item.codeNo,
            course: item.course,
            year: item.yearLevel,
            dept: item.dept
          }]
        } as any);
      }
    }
    return groupedID;
  }

  getUniqueProgramsAll(data: any[]): ProgramSchedule[] {
    const groupedProg: ProgramSchedule[] = [];
    for (const item of data) {
      const existingProgram = groupedProg.find(p => p.program === item.course && p.year === item.yearLevel);
      const subjectData = {
        subjectId: item.subjectId,
        subjectTitle: item.subjectTitle,
        codeNo: item.codeNo,
        units: Number(item.lecUnits) || 0
      };
      if (existingProgram) {
        const exists = existingProgram.subjects.find(s => s.subjectId === subjectData.subjectId);
        if (!exists) existingProgram.subjects.push(subjectData);
      } else {
        groupedProg.push({
          program: item.course,
          year: item.yearLevel,
          dept: item.dept,
          subjects: [subjectData],
          schedule: {},
          remainingSubjects: 0
        } as ProgramSchedule);
      }
    }
    groupedProg.sort((a, b) => a.program.localeCompare(b.program) || Number(a.year) - Number(b.year));
    return groupedProg;
  }

  capturePrev(prog: ProgramSchedule, fullSlot: string) {
    const prev = (prog.schedule && prog.schedule[fullSlot]) ? prog.schedule[fullSlot] : '';
    this.prevSelection[fullSlot] = prev;
  }

  getAvailableSubjects(prog: ProgramSchedule, fullSlot: string) {
    const selectedSubjectIds = new Set<string>();
    for (const pAll of this.programsAll) {
      const vals = Object.values(pAll.schedule || {});
      for (const v of vals) {
        if (v) selectedSubjectIds.add(v);
      }
    }
    const currentSelected = prog.schedule && prog.schedule[fullSlot] ? prog.schedule[fullSlot] : '';
    return prog.subjects.filter(subj => !selectedSubjectIds.has(subj.subjectId) || subj.subjectId === currentSelected);
  }

  onSubjectSelect(prog: ProgramSchedule, slot: string, day: string) {
    const fullSlot = `${day}_${slot}`;
    const selectedId = prog.schedule && prog.schedule[fullSlot] ? prog.schedule[fullSlot] : '';

    if (!selectedId) {
      const previousSubjectId = this.prevSelection[fullSlot] || '';

      if (previousSubjectId) {
        const subjectData = prog.subjects.find(s => s.subjectId === previousSubjectId);
        const units = subjectData && subjectData.units ? Number(subjectData.units) : 3;
        const slotsForDay = this.daysWithTimeSlots[day] || [];

        for (const p of this.programsAll) {
          if (p.schedule) {
            Object.keys(p.schedule)
              .filter(k => p.schedule[k] === previousSubjectId)
              .forEach(k => {
                if (units === 6) {
                  const [kDay, kSlot] = k.split('_');
                  const idx = slotsForDay.indexOf(kSlot);
                  if (idx !== -1) {
                    const nextSlot = slotsForDay[idx + 1];
                    const prevSlot = slotsForDay[idx - 1];
                    const nextKey = nextSlot ? `${day}_${nextSlot}` : '';
                    const prevKey = prevSlot ? `${day}_${prevSlot}` : '';

                    if (nextKey && p.schedule[nextKey] === previousSubjectId) {
                      p.schedule[nextKey] = '';
                    }
                    if (prevKey && p.schedule[prevKey] === previousSubjectId) {
                      p.schedule[prevKey] = '';
                    }
                  }
                }
                p.schedule[k] = '';
              });
          }
        }
      }

      delete this.prevSelection[fullSlot];
      this.programs = this.programsAll.filter(p => !(p.dept && p.dept.toUpperCase() === 'SAS'));
      this.updateRemainingSubjectsForAll();
      this.updateSelectedScheduleOutput();
      return;
    }

    for (const p of this.programsAll) {
      const vals = Object.values(p.schedule || {});
      if (vals.includes(selectedId)) {
        if (!(p.program === prog.program && p.year === prog.year && p.schedule[fullSlot] === selectedId)) {
          this.global.swalAlertError("This subject is already assigned in another slot.");
          prog.schedule[fullSlot] = '';
          return;
        }
      }
    }

    const subjectData = prog.subjects.find(s => s.subjectId === selectedId);
    const units = subjectData && subjectData.units ? Number(subjectData.units) : 3;

    for (const p of this.programsAll) {
      if (p.subjects.find(s => s.subjectId === selectedId)) {
        if (!p.schedule) p.schedule = {};
        const slotsForDay = this.daysWithTimeSlots[day] || [];
        const currentIndex = slotsForDay.indexOf(slot);
        if (currentIndex === -1) continue;
        p.schedule[fullSlot] = selectedId;

        if (units === 6 && currentIndex + 1 < slotsForDay.length) {
          const nextSlot = slotsForDay[currentIndex + 1];
          const nextFullSlot = `${day}_${nextSlot}`;
          p.schedule[nextFullSlot] = selectedId;
        }
      }
    }

    this.programs = this.programsAll.filter(p => !(p.dept && p.dept.toUpperCase() === 'SAS'));
    this.updateRemainingSubjectsForAll();
    this.updateSelectedScheduleOutput();
    this.prevSelection[fullSlot] = selectedId;
  }

  updateSelectedDates(newDates: string[]) {
    const oldDates = this.selectedDates;
    const oldDateMap = oldDates.reduce((map, date, index) => {
      map[index] = date;
      return map;
    }, {} as { [index: number]: string });

    if (newDates.length === oldDates.length) {
      newDates.forEach((newDate, index) => {
        const oldDate = oldDateMap[index];
        if (oldDate && newDate !== oldDate) {
          this.programs.forEach(prog => {
            Object.keys(prog.schedule).forEach(key => {
              if (key.startsWith(oldDate + '_')) {
                const newKey = key.replace(oldDate, newDate);
                prog.schedule[newKey] = prog.schedule[key];
                delete prog.schedule[key];
              }
            });
          });
          if (this.daysWithTimeSlots[oldDate]) {
            this.daysWithTimeSlots[newDate] = this.daysWithTimeSlots[oldDate];
            delete this.daysWithTimeSlots[oldDate];
          }
        }
      });
    }

    this.selectedDates = newDates;
  }

  openExamDateDialog() {
    const dialogRef = this.dialog.open(DatePickerComponent, {
      width: '500px',
      disableClose: true,
      data: { selectedDates: this.selectedDates }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result || !result.length) return;

      const validResults = result.filter((r: any) => r.date);
      if (validResults.length === 0) return;

      const AM_SLOTS = ['7:30 AM - 9:00 AM', '9:00 AM - 10:30 AM', '10:30 AM - 12:00 PM'];
      const PM_SLOTS = ['12:00 PM - 1:30 PM', '1:30 PM - 3:00 PM', '3:00 PM - 4:30 PM', '4:30 PM - 6:00 PM', '6:00 PM - 7:30 PM'];

      const newDates: string[] = [];
      validResults.forEach((r: any) => {
        const formatted = new Date(r.date).toLocaleDateString('en-CA');
        newDates.push(formatted);
      });

      this.updateSelectedDates(newDates);

      validResults.forEach((r: any) => {
        const key = new Date(r.date).toLocaleDateString('en-CA');
        if (r.am && r.pm) this.daysWithTimeSlots[key] = [...AM_SLOTS, ...PM_SLOTS];
        else if (r.am) this.daysWithTimeSlots[key] = [...AM_SLOTS];
        else if (r.pm) this.daysWithTimeSlots[key] = [...PM_SLOTS];
      });

      for (const p of this.programsAll) {
        if (!p.schedule) p.schedule = {};
        for (const dateStr of this.selectedDates) {
          const slots = this.daysWithTimeSlots[dateStr] || [];
          for (const slot of slots) {
            const full = `${dateStr}_${slot}`;
            if (typeof p.schedule[full] === 'undefined') p.schedule[full] = '';
          }
        }
      }

      this.programs = this.programsAll.filter(p => !(p.dept && p.dept.toUpperCase() === 'SAS'));
      this.updateSelectedScheduleOutput();
      this.updateRemainingSubjectsForAll();
    });
  }

  goNext() {
    if (!this.activeTerm) {
      this.global.swalAlertError("Please select a term first!");
      return;
    }

    if (this.selectedDates.length === 0) {
      this.global.swalAlertError("Please select exam dates before proceeding!");
      return;
    }

    if (this.programs.length === 0) {
      this.global.swalAlertError("No program data loaded for this term.");
      return;
    }

    this.showTable = true;
  }

  updateRemainingSubjectsForAll() {
    for (const p of this.programs) {
      p.remainingSubjects = this.getRemainingSubjectsConsideringAllDays(p);
    }
  }

  getRemainingSubjectsConsideringAllDays(prog: ProgramSchedule): number {
    const total = (prog.subjects || []).length;
    const assigned = new Set<string>();
    const keys = Object.keys(prog.schedule || {});
    for (const key of keys) {
      const val = prog.schedule[key];
      if (val) assigned.add(val);
    }
    return total - assigned.size;
  }

  getRemainingSubjects(prog: ProgramSchedule): number {
    const total = (prog.subjects || []).length;
    const assignedCount = Object.values(prog.schedule || {}).filter((v: any) => v).length;
    return total - assignedCount;
  }

  updateSelectedScheduleOutput() {
    this.selectedScheduleOutput = [];
    for (const day of this.selectedDates) {
      const programsForDay: any[] = [];
      for (const p of this.programs) {
        const subjArr: any[] = [];
        const keys = Object.keys(p.schedule || {});
        for (const key of keys) {
          if (key.startsWith(day + '_')) {
            const subjId = p.schedule[key];
            if (subjId) {
              const subj = p.subjects.find(s => s.subjectId === subjId);
              subjArr.push({
                subjectId: subj ? subj.subjectId : '',
                subjectTitle: subj ? subj.subjectTitle : '',
                codeNo: subj ? subj.codeNo : '',
                sched: key.replace(day + '_', '')
              });
            }
          }
        }
        programsForDay.push({ program: p.program, year: p.year, subjects: subjArr });
      }
      this.selectedScheduleOutput.push({ date: day, programs: programsForDay });
    }
  }

  saveSchedule() {
    console.log("Final Schedule Output:", this.selectedScheduleOutput);
    this.sharedData.setFinalSubjectList(this.selectedScheduleOutput);
    this.sharedData.setStudentMapping(this.selectedScheduleOutput);
    this.global.swalSuccess("Schedule saved successfully!");
  }

  removeDate(dateToRemove: string) {
    this.swal.fire({
      title: 'Remove Date?',
      text: `Are you sure you want to delete ${new Date(dateToRemove).toDateString()} and all its schedules?`,
      type: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, remove it',
      cancelButtonText: 'Cancel'
    })
    .then((result) => {
      if (!result.value) return;

      this.selectedDates = this.selectedDates.filter(d => d !== dateToRemove);
      delete this.daysWithTimeSlots[dateToRemove];

      for (const p of this.programsAll) {
        if (p.schedule) {
          Object.keys(p.schedule)
            .filter(key => key.startsWith(dateToRemove + '_'))
            .forEach(key => delete p.schedule[key]);
        }
      }

      this.updateSelectedScheduleOutput();
      this.updateRemainingSubjectsForAll();

      if (this.selectedDates.length === 0) this.showTable = false;

      this.swal.fire('Deleted!', 'The selected exam date and its schedules were removed.', 'success');
    });
  }
  // ADD THIS METHOD at the end of the class
clearAllData() {
  if (!confirm(' This will DELETE ALL exam schedules and data. Are you sure?')) {
    return;
  }

  // Clear all localStorage
  this.sharedData.clearExamDates();
  this.sharedData.clearStudentMapping();
  this.sharedData.clearRoomMapping();
  this.sharedData.clearSelectedExamGroup();

  // Reset component state
  this.selectedDates = [];
  this.daysWithTimeSlots = {};
  this.selectedScheduleOutput = [];
  this.programsAll = [];
  this.programs = [];
  this.showTable = false;
  this.activeTerm = '';

  this.global.swalSuccess('All data cleared successfully!');
  console.log(' All localStorage data cleared');
}

  loadSwal() {
    this.swal.fire({
      title: 'Loading',
      text: '',
      type: 'info',
      allowOutsideClick: false,
      allowEscapeKey: false,
      onOpen: function () {
        Swal.showLoading();
      }
    });
  }
}