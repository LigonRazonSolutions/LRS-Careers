const SHEET_ID = '16CUqa7rYyOmTwOYqUjwGv2zazLEvug5b3BijtWZiY2I';
const FOLDER_ID = '1Cs3NRkR2lZS-gimNrjvLYZrLhEsNbJbM';
const SHEET_NAME = 'Applications';

const CANONICAL_HEADERS = [
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
];

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
    let portfolioFileLink = '';

    if (data.cvBase64) {
      cvLink = uploadBase64ToDrive(
        data.cvBase64,
        data.cvFileName,
        data.cvMimeType,
        applicantFolder
      );
    }

    if (data.portBase64) {
      portfolioFileLink = uploadBase64ToDrive(
        data.portBase64,
        data.portFileName,
        data.portMimeType,
        applicantFolder
      );
    }

    const record = {
      'Timestamp': new Date(),
      'Last Name': data.lastName || '',
      'First Name': data.firstName || '',
      'Middle Initial': data.middleInitial || '',
      'Email Address': data.email || '',
      'Phone Number': data.phone || '',
      'Location': data.location || '',
      'Role Applying': data.roleApplying || data.position || '',
      'Years of Experience': data.experience || '',
      'Preferred Timezone': data.timezone || '',
      'Relevant Skills': data.skills || '',
      'Short Introduction': data.intro || '',
      'Portfolio Link': data.portfolioLink || '',
      'CV File Link': cvLink,
      'Portfolio File Link': portfolioFileLink,
      'Applicant Folder Link': applicantFolder.getUrl()
    };

    appendRecordByHeaders(sheet, record);

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
  }

  ensureHeaders(sheet);
  return sheet;
}

function ensureHeaders(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), CANONICAL_HEADERS.length));
  const currentHeaders = headerRange.getValues()[0].map(v => String(v || '').trim());

  const isEmptyHeaderRow = currentHeaders.every(v => v === '');

  if (isEmptyHeaderRow) {
    sheet.getRange(1, 1, 1, CANONICAL_HEADERS.length).setValues([CANONICAL_HEADERS]);
    sheet.getRange(1, 1, 1, CANONICAL_HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#2A957D')
      .setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
    return;
  }

  // Ensure every canonical header exists somewhere in row 1.
  const existingMap = buildHeaderMap(currentHeaders);

  let changed = false;
  CANONICAL_HEADERS.forEach(header => {
    if (!existingMap.has(normalizeHeader(header))) {
      currentHeaders.push(header);
      changed = true;
    }
  });

  if (changed) {
    sheet.getRange(1, 1, 1, currentHeaders.length).setValues([currentHeaders]);
    sheet.getRange(1, 1, 1, currentHeaders.length)
      .setFontWeight('bold')
      .setBackground('#2A957D')
      .setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }
}

function appendRecordByHeaders(sheet, record) {
  const lastColumn = Math.max(sheet.getLastColumn(), CANONICAL_HEADERS.length);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(v => String(v || '').trim());

  const row = new Array(headers.length).fill('');
  const headerMap = buildHeaderMap(headers);

  Object.keys(record).forEach(key => {
    const idx = findHeaderIndex(headerMap, key);
    if (idx !== -1) {
      row[idx] = record[key];
    }
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
}

function buildHeaderMap(headers) {
  const map = new Map();
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (normalized) map.set(normalized, index);
  });
  return map;
}

function normalizeHeader(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s_]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

function findHeaderIndex(headerMap, key) {
  const aliases = {
    'Timestamp': ['timestamp', 'date submitted', 'submitted at', 'submission date'],
    'Last Name': ['last name', 'surname', 'family name'],
    'First Name': ['first name', 'given name'],
    'Middle Initial': ['middle initial', 'mi', 'middle'],
    'Email Address': ['email address', 'email', 'email address *'],
    'Phone Number': ['phone number', 'phone', 'mobile number'],
    'Location': ['location', 'current location'],
    'Role Applying': ['role applying', 'position applying for', 'position', 'applied role'],
    'Years of Experience': ['years of experience', 'experience'],
    'Preferred Timezone': ['preferred timezone', 'working hours', 'preferred timezone / working hours'],
    'Relevant Skills': ['relevant skills', 'skills'],
    'Short Introduction': ['short introduction', 'about yourself', 'intro'],
    'Portfolio Link': ['portfolio link', 'link'],
    'CV File Link': ['cv file link', 'resume link', 'cv link'],
    'Portfolio File Link': ['portfolio file link', 'portfolio upload link'],
    'Applicant Folder Link': ['applicant folder link', 'folder link']
  };

  const options = [key].concat(aliases[key] || []);
  for (const option of options) {
    const normalized = normalizeHeader(option);
    if (headerMap.has(normalized)) return headerMap.get(normalized);
  }
  return -1;
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
