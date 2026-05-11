const SHEET_ID = '16CUqa7rYyOmTwOYqUjwGv2zazLEvug5b3BijtWZiY2I';
const FOLDER_ID = '1Cs3NRkR2lZS-gimNrjvLYZrLhEsNbJbM';

function doGet() {
  return ContentService
    .createTextOutput('LRS Recruitment Backend is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}
