 export interface Job {
   id: string;
   title: string;
   company: string;
   location: string;
   description: string;
   skills: string[];
   postedDate: Date;
   externalApplyLink: string;
   isReviewing: boolean;
 }
 
 export interface AppliedJob extends Job {
   appliedAt: Date;
 }
 
 export interface SavedJob extends Job {
   savedAt: Date;
 }