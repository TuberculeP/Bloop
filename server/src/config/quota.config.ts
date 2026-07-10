export const USER_SAMPLE_QUOTA_BYTES =
  Number(process.env.USER_SAMPLE_QUOTA_MB ?? 250) * 1024 * 1024;

export const USER_SAMPLE_MAX_FILE_BYTES = 20 * 1024 * 1024;
