export enum UserRole {
  DATA_ENTRY = 'data_entry',
  RECRUITER = 'recruiter',
  PROCESS_MANAGER = 'process_manager',
  MANAGER = 'manager',
  ADMIN = 'admin',
  ASSOCIATE = 'associate',
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ASSOCIATE]: 0,
  [UserRole.DATA_ENTRY]: 1,
  [UserRole.RECRUITER]: 2,
  [UserRole.PROCESS_MANAGER]: 3,
  [UserRole.MANAGER]: 4,
  [UserRole.ADMIN]: 5,
};
