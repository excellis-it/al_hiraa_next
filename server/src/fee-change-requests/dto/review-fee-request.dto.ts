import { IsEnum } from 'class-validator';

export enum FeeRequestReviewStatus {
  approved = 'approved',
  rejected = 'rejected',
}

export class ReviewFeeRequestDto {
  @IsEnum(FeeRequestReviewStatus)
  status: FeeRequestReviewStatus;
}
