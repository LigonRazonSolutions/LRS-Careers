const SHEET_ID = '16CUqa7rYyOmTwOYqUjwGv2zazLEvug5b3BijtWZiY2I';
const FOLDER_ID = '1Cs3NRkR2lZS-gimNrjvLYZrLhEsNbJbM';
const SHEET_NAME = 'Applications';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const sheet = getOrCreateSheet();
    const parentFolder = DriveApp.getFolderById(FOLDER_ID);

    const applicantName = buildApplicantName(data);
    const roleApplying = (data.roleApplying || data.position || 'Application').toString().trim();

    const applicantFolder = getOrCreateApplicantFolder(
      parentFolder,
      applicantName,
      roleApplying
    );

    let cvLink = '';
    let portfolioLink = '';

    if (data.cvBase64) {
      cvLink = uploadBase64ToDrive(
        data.cvBase64,
        data.cvFileName,
        data.cvMimeType,
        applicantFolder
      );
    }

    if (data.portBase64) {
      portfolioLink = uploadBase64ToDrive(
        data.portBase64,
        data.portFileName,
        data.portMimeType,
        applicantFolder
      );
    }

    sheet.appendRow([
      new Date(),
      data.lastName || '',
      data.firstName || '',
      data.middleInitial || '',
      data.email || '',
      data.phone || '',
      data.location || '',
      (data.roleApplying || data.position || ''),
      data.experience || '',
      data.timezone || '',
      data.skills || '',
      data.intro || '',
      data.portfolioLink || '',
      cvLink,
      portfolioLink,
      applicantFolder.getUrl()
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Application submitted successfully.'
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {

    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet() {

  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);

  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {

    sheet = spreadsheet.insertSheet(SHEET_NAME);

    sheet.appendRow([
      'Timestamp',
      'Last Name',
      'First Name',
      'Middle Initial',
      'Email Address',
      'Phone Number',
      'Location',
      'Role Applying',
      'Years of Experience',
      'Preferred Timezone',
      'Relevant Skills',
      'Short Introduction',
      'Portfolio Link',
      'CV File Link',
      'Portfolio File Link',
      'Applicant Folder Link'
    ]);

    sheet.getRange(1, 1, 1, 16)
      .setFontWeight('bold')
      .setBackground('#2A957D')
      .setFontColor('#FFFFFF');

    sheet.setFrozenRows(1);
  }

  return sheet;
}

function buildApplicantName(data) {
  const lastName = (data.lastName || '').toString().trim();
  const firstName = (data.firstName || '').toString().trim();
  const middleInitial = (data.middleInitial || '').toString().trim();
  const fromParts = [lastName, firstName, middleInitial].filter(Boolean).join(' ').trim();
  return fromParts || (data.name || 'Applicant').toString().trim() || 'Applicant';
}

function getOrCreateApplicantFolder(parentFolder, applicantName, position) {

  const sanitizedName = applicantName
    .replace(/[\\/:*?"<>|]/g, '')
    .trim();

  const sanitizedPosition = (position || 'Application')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim();

  const folderName = sanitizedName + ' - ' + sanitizedPosition;

  const existingFolders = parentFolder.getFoldersByName(folderName);

  if (existingFolders.hasNext()) {
    return existingFolders.next();
  }

  const folder = parentFolder.createFolder(folderName);

  folder.setSharing(
    DriveApp.Access.ANYONE_WITH_LINK,
    DriveApp.Permission.VIEW
  );

  return folder;
}

function uploadBase64ToDrive(base64Data, fileName, mimeType, folder) {

  const blob = Utilities.newBlob(
    Utilities.base64Decode(base64Data),
    mimeType,
    fileName
  );

  const file = folder.createFile(blob);

  file.setSharing(
    DriveApp.Access.ANYONE_WITH_LINK,
    DriveApp.Permission.VIEW
  );

  return file.getUrl();
}

function doGet() {
  return ContentService
    .createTextOutput('LRS Recruitment Backend is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}
