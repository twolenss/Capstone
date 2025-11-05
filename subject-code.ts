interface SubjectCode {
    codeNo: string;
    course: string;
    year: string | number;
    dept : string
}
export interface SubjectGroup {
    subjectId: string;
    subjectTitle: string;
    codes: SubjectCode[];
}   

export interface DepartmentGroup {
  dept: string;
  deptCode: string;
  loadingDepartments: string[];
}

export interface Exam {
  code: string;
  subjectId: string;
  title: string;
  course: string;
  dept: string;
  day: string;
  time: string;
  room: string;
  year: string;
}
