// Centralized model exports for easy importing
export { default as User, type IUser } from './User';
export { default as GlossaryTerm, type IGlossaryTerm } from './GlossaryTerm';
export { default as ContentModule, type IContentModule } from './ContentModule';
export { default as SunburstMap, type ISunburstMap } from './SunburstMap';
export { default as UserBookmark, type IUserBookmark } from './UserBookmark';
export { default as Notification, type INotification } from './Notification';
export { default as GuestCredit, type IGuestCredit } from './GuestCredit';
export { default as StudentProject, type IStudentProject } from './StudentProject';
export { default as AdminSettings, type IAdminSettings } from './AdminSettings';

// Re-export database connection
export { default as dbConnect } from './mongodb'; 