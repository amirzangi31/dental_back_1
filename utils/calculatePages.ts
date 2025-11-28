export const calculatePages = (
  totalRecords: number,
  limit: number,
  page: number
) => {
  const limitNumber = Math.max(Number(limit) || 10, 1); // حداقل 1
  const totalPages = Math.ceil(totalRecords / limitNumber) || 1;

  const pageNumber = Math.min(Math.max(Number(page) || 1, 1), totalPages); // بین 1 تا totalPages
  const skip = (pageNumber - 1) * limitNumber;

  return {
    skip,
    totalPages,
    page: pageNumber,
    limit: limitNumber,
  };
};
