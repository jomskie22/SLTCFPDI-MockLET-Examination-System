import { Router, Request, Response } from 'express';
import { db } from '../db/index.ts';
import { studentMasterlist, users, auditLogs, examRequests } from '../db/schema.ts';
import { eq, desc, or, ilike, and } from 'drizzle-orm';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.ts';
import multer from 'multer';
import ExcelJS from 'exceljs';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const isExcel =
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls');

    if (isExcel) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Please upload an Excel spreadsheet (.xlsx or .xls).'));
    }
  },
});

const router = Router();

// 1. Verify Student ID (Public / Examinee Registration)
router.post('/verify-id', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.body;
    if (!studentId || typeof studentId !== 'string' || !studentId.trim()) {
      return res.status(400).json({ error: 'Student ID Number is required for verification.' });
    }

    const cleanId = studentId.trim().toUpperCase();

    // Enforce official format: SLPD-YYYY-COL-NNNN
    const formatValid = /^SLPD-\d{4}-COL-\d{4}$/.test(cleanId);
    if (!formatValid) {
      return res.status(400).json({
        verified: false,
        error: `Invalid Student ID format "${cleanId}". Official format required: SLPD-YYYY-COL-NNNN (e.g., SLPD-2024-COL-0190).`,
      });
    }

    // Query official student masterlist
    const allMaster = await db.select().from(studentMasterlist);
    const student = allMaster.find(m => m.studentId.trim().toUpperCase() === cleanId);

    if (!student) {
      return res.status(404).json({
        verified: false,
        error: `Student ID "${cleanId}" was not found in the official SLTCFPDI examinee database. Access is restricted to graduating examinees uploaded by Faculty or Admin.`,
      });
    }

    // Check if an examinee account already registered with this student ID
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      studentId: users.studentId,
      isActive: users.isActive,
    }).from(users);

    const existingAccount = allUsers.find(
      u => u.studentId && u.studentId.trim().toUpperCase() === cleanId
    );

    if (existingAccount) {
      // Fetch latest clearance request status
      const [latestReq] = await db
        .select()
        .from(examRequests)
        .where(eq(examRequests.userId, existingAccount.id))
        .orderBy(desc(examRequests.requestedAt));

      const clearanceStatus = latestReq ? latestReq.status : 'NOT_REQUESTED';
      const clearanceNotes = latestReq?.reviewNotes || null;

      return res.status(200).json({
        verified: true,
        alreadyRegistered: true,
        clearanceStatus,
        clearanceNotes,
        existingEmail: existingAccount.email,
        message: `An examinee account for Student ID "${cleanId}" is already registered (${existingAccount.email}). Current MockLET Clearance: ${clearanceStatus}. Please sign in to your individual account.`,
        student: {
          id: student.id,
          studentId: student.studentId,
          fullName: `${student.firstName} ${student.middleName ? student.middleName + ' ' : ''}${student.lastName}`,
          course: student.course,
          yearGraduated: student.yearGraduated,
        },
      });
    }

    // Student ID is verified and available for new account registration
    return res.status(200).json({
      verified: true,
      alreadyRegistered: false,
      message: `Student ID "${cleanId}" verified successfully in official masterlist. You may now create your individual examinee account.`,
      student: {
        id: student.id,
        studentId: student.studentId,
        lastName: student.lastName,
        firstName: student.firstName,
        middleName: student.middleName || '',
        fullName: `${student.firstName} ${student.middleName ? student.middleName + ' ' : ''}${student.lastName}`,
        course: student.course,
        yearGraduated: student.yearGraduated,
      },
    });
  } catch (error: any) {
    console.error('Verify student ID error:', error);
    return res.status(500).json({ error: 'Failed to verify Student ID number' });
  }
});

// 2. Download Official Excel Template
router.get('/template', async (_req: Request, res: Response) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SLTCFPDI MockLET System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Student Masterlist');

    // Define columns
    worksheet.columns = [
      { header: 'Student ID Number', key: 'studentId', width: 22 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Middle Name', key: 'middleName', width: 18 },
      { header: 'Course', key: 'course', width: 28 },
      { header: 'Year Graduated', key: 'yearGraduated', width: 18 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1D4ED8' }, // Blue
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 26;

    // Add sample rows using official SLPD-YYYY-COL-NNNN format
    worksheet.addRow({
      studentId: 'SLPD-2024-COL-0190',
      lastName: 'Gomez',
      firstName: 'Elena Marie',
      middleName: 'Castro',
      course: 'BSED Major in English',
      yearGraduated: '2026',
    });
    worksheet.addRow({
      studentId: 'SLPD-2024-COL-0191',
      lastName: 'Dela Cruz',
      firstName: 'Juan',
      middleName: 'Santos',
      course: 'BEED General Education',
      yearGraduated: '2026',
    });
    worksheet.addRow({
      studentId: 'SLPD-2023-COL-0112',
      lastName: 'Bautista',
      firstName: 'John Mark',
      middleName: 'Salazar',
      course: 'BSED Major in English',
      yearGraduated: '2026',
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="SLTCFPDI_Student_Masterlist_Template.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('Download template error:', error);
    return res.status(500).json({ error: 'Failed to generate Excel template' });
  }
});

// 3. Get Student Masterlist Records (Admin & Faculty)
router.get('/', requireAuth, requireRole(['ADMIN', 'FACULTY']), async (req: AuthRequest, res: Response) => {
  try {
    const { search, course, yearGraduated } = req.query;

    const allStudents = await db
      .select({
        id: studentMasterlist.id,
        studentId: studentMasterlist.studentId,
        lastName: studentMasterlist.lastName,
        firstName: studentMasterlist.firstName,
        middleName: studentMasterlist.middleName,
        course: studentMasterlist.course,
        yearGraduated: studentMasterlist.yearGraduated,
        createdAt: studentMasterlist.createdAt,
        updatedAt: studentMasterlist.updatedAt,
        uploadedById: studentMasterlist.uploadedById,
        uploadedByName: users.fullName,
        uploadedByRole: users.role,
      })
      .from(studentMasterlist)
      .leftJoin(users, eq(studentMasterlist.uploadedById, users.id))
      .orderBy(desc(studentMasterlist.createdAt));

    let filtered = allStudents;

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(s =>
        s.studentId.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.firstName.toLowerCase().includes(q) ||
        (s.middleName && s.middleName.toLowerCase().includes(q)) ||
        s.course.toLowerCase().includes(q) ||
        s.yearGraduated.toLowerCase().includes(q)
      );
    }

    if (course && typeof course === 'string' && course !== 'ALL') {
      filtered = filtered.filter(s => s.course === course);
    }

    if (yearGraduated && typeof yearGraduated === 'string' && yearGraduated !== 'ALL') {
      filtered = filtered.filter(s => s.yearGraduated === yearGraduated);
    }

    return res.json({
      total: filtered.length,
      records: filtered,
    });
  } catch (error: any) {
    console.error('Fetch student masterlist error:', error);
    return res.status(500).json({ error: 'Failed to retrieve student masterlist records' });
  }
});

// 4. Excel Upload Processing (Admin & Faculty)
router.post('/upload', requireAuth, requireRole(['ADMIN', 'FACULTY']), upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Please select an Excel file (.xlsx or .xls) to upload.' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return res.status(400).json({ error: 'Uploaded workbook is empty or has no readable worksheets.' });
    }

    // Header mapping helper
    let headerRowIdx = 1;
    let colMap: Record<string, number> = {};

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 3 && Object.keys(colMap).length === 0) {
        const values = (row.values as any[]) || [];
        values.forEach((val, idx) => {
          if (!val) return;
          const str = String(val).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          if (str.includes('studentid') || str.includes('idnumber') || str === 'id' || str.includes('studentno')) {
            colMap['studentId'] = idx;
          } else if (str.includes('lastname') || str.includes('surname')) {
            colMap['lastName'] = idx;
          } else if (str.includes('firstname') || str.includes('givenname')) {
            colMap['firstName'] = idx;
          } else if (str.includes('middlename') || str.includes('mi') || str.includes('middle')) {
            colMap['middleName'] = idx;
          } else if (str.includes('course') || str.includes('program') || str.includes('major')) {
            colMap['course'] = idx;
          } else if (str.includes('yeargraduated') || str.includes('graduated') || str.includes('batch') || str.includes('year')) {
            colMap['yearGraduated'] = idx;
          }
        });
        if (colMap['studentId'] && colMap['lastName'] && colMap['firstName']) {
          headerRowIdx = rowNumber;
        }
      }
    });

    if (!colMap['studentId'] || !colMap['lastName'] || !colMap['firstName']) {
      return res.status(400).json({
        error:
          'Invalid Excel columns. Required header columns: "Student ID Number", "Last Name", "First Name", "Middle Name", "Course", and "Year Graduated". Please download the sample template for the exact format.',
      });
    }

    const errors: Array<{ row: number; studentId?: string; reason: string }> = [];
    const duplicates: Array<{ row: number; studentId: string; name: string }> = [];
    const validRowsToInsert: Array<{
      studentId: string;
      lastName: string;
      firstName: string;
      middleName: string | null;
      course: string;
      yearGraduated: string;
      uploadedById: number;
    }> = [];

    // Query existing student IDs to prevent duplicate inserts
    const existingList = await db.select({ studentId: studentMasterlist.studentId }).from(studentMasterlist);
    const existingIdSet = new Set(existingList.map(s => s.studentId.trim().toUpperCase()));
    const batchEncounteredSet = new Set<string>();

    let totalDataRows = 0;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowIdx) return; // Skip headers

      const rowValues = (row.values as any[]) || [];
      const getVal = (colIdx?: number) => {
        if (!colIdx || colIdx >= rowValues.length) return '';
        const v = rowValues[colIdx];
        if (v === null || v === undefined) return '';
        if (typeof v === 'object' && v.text) return String(v.text).trim();
        return String(v).trim();
      };

      const sId = getVal(colMap['studentId']);
      const lName = getVal(colMap['lastName']);
      const fName = getVal(colMap['firstName']);
      const mName = getVal(colMap['middleName']);
      const crs = getVal(colMap['course']) || 'Bachelor of Elementary Education';
      const yrGrad = getVal(colMap['yearGraduated']) || new Date().getFullYear().toString();

      // Skip blank rows
      if (!sId && !lName && !fName) return;

      totalDataRows++;

      if (!sId) {
        errors.push({ row: rowNumber, reason: 'Missing Student ID Number' });
        return;
      }
      if (!lName) {
        errors.push({ row: rowNumber, studentId: sId, reason: 'Missing Last Name' });
        return;
      }
      if (!fName) {
        errors.push({ row: rowNumber, studentId: sId, reason: 'Missing First Name' });
        return;
      }

      const upperId = sId.toUpperCase();

      // Check duplicates in database or current file batch
      if (existingIdSet.has(upperId) || batchEncounteredSet.has(upperId)) {
        duplicates.push({ row: rowNumber, studentId: sId, name: `${lName}, ${fName}` });
        return;
      }

      batchEncounteredSet.add(upperId);

      validRowsToInsert.push({
        studentId: sId,
        lastName: lName,
        firstName: fName,
        middleName: mName || null,
        course: crs,
        yearGraduated: yrGrad,
        uploadedById: req.user!.id,
      });
    });

    // Execute bulk insert for valid records
    let insertedCount = 0;
    if (validRowsToInsert.length > 0) {
      for (const record of validRowsToInsert) {
        await db.insert(studentMasterlist).values(record);
        insertedCount++;
      }
    }

    // Record audit log
    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: 'EXCEL_STUDENT_UPLOAD',
      details: `Uploaded student database (${req.file.originalname}): ${insertedCount} imported, ${duplicates.length} duplicates skipped, ${errors.length} errors.`,
    });

    return res.status(200).json({
      success: true,
      message: `Excel upload completed: ${insertedCount} new student records imported into official masterlist.`,
      filename: req.file.originalname,
      totalRowsProcessed: totalDataRows,
      importedCount: insertedCount,
      duplicateCount: duplicates.length,
      errorCount: errors.length,
      duplicates,
      errors,
    });
  } catch (error: any) {
    console.error('Excel upload error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process and validate Excel file.' });
  }
});

// 5. Create Single Student Record Manually (Admin & Faculty)
router.post('/', requireAuth, requireRole(['ADMIN', 'FACULTY']), async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, lastName, firstName, middleName, course, yearGraduated } = req.body;

    if (!studentId || !lastName || !firstName || !course || !yearGraduated) {
      return res.status(400).json({ error: 'Student ID, Last Name, First Name, Course, and Year Graduated are required.' });
    }

    const cleanId = studentId.trim();

    const [existing] = await db
      .select({ id: studentMasterlist.id })
      .from(studentMasterlist)
      .where(eq(studentMasterlist.studentId, cleanId));

    if (existing) {
      return res.status(400).json({ error: `A student with Student ID "${cleanId}" already exists in the masterlist.` });
    }

    const [newStudent] = await db.insert(studentMasterlist).values({
      studentId: cleanId,
      lastName: lastName.trim(),
      firstName: firstName.trim(),
      middleName: middleName ? middleName.trim() : null,
      course: course.trim(),
      yearGraduated: yearGraduated.trim(),
      uploadedById: req.user!.id,
    }).returning();

    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: 'STUDENT_RECORD_CREATE',
      details: `Added official student record: ${newStudent.lastName}, ${newStudent.firstName} (${newStudent.studentId})`,
    });

    return res.status(201).json(newStudent);
  } catch (error: any) {
    console.error('Create student error:', error);
    return res.status(500).json({ error: 'Failed to create student record' });
  }
});

// 6. Update Student Record
router.put('/:id', requireAuth, requireRole(['ADMIN', 'FACULTY']), async (req: AuthRequest, res: Response) => {
  try {
    const studentDbId = parseInt(req.params.id, 10);
    const { studentId, lastName, firstName, middleName, course, yearGraduated } = req.body;

    const [existing] = await db
      .select()
      .from(studentMasterlist)
      .where(eq(studentMasterlist.id, studentDbId));

    if (!existing) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    // If studentId changed, check uniqueness
    if (studentId && studentId.trim() !== existing.studentId) {
      const [duplicate] = await db
        .select({ id: studentMasterlist.id })
        .from(studentMasterlist)
        .where(eq(studentMasterlist.studentId, studentId.trim()));

      if (duplicate && duplicate.id !== studentDbId) {
        return res.status(400).json({ error: `Student ID "${studentId}" is already assigned to another student.` });
      }
    }

    const [updated] = await db.update(studentMasterlist).set({
      studentId: studentId ? studentId.trim() : existing.studentId,
      lastName: lastName ? lastName.trim() : existing.lastName,
      firstName: firstName ? firstName.trim() : existing.firstName,
      middleName: middleName !== undefined ? (middleName ? middleName.trim() : null) : existing.middleName,
      course: course ? course.trim() : existing.course,
      yearGraduated: yearGraduated ? yearGraduated.trim() : existing.yearGraduated,
      updatedAt: new Date(),
    }).where(eq(studentMasterlist.id, studentDbId)).returning();

    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: 'STUDENT_RECORD_UPDATE',
      details: `Updated student record for ${updated.studentId} (${updated.lastName}, ${updated.firstName})`,
    });

    return res.json(updated);
  } catch (error: any) {
    console.error('Update student record error:', error);
    return res.status(500).json({ error: 'Failed to update student record' });
  }
});

// 7. Delete Student Record
router.delete('/:id', requireAuth, requireRole(['ADMIN', 'FACULTY']), async (req: AuthRequest, res: Response) => {
  try {
    const studentDbId = parseInt(req.params.id, 10);

    const [existing] = await db
      .select()
      .from(studentMasterlist)
      .where(eq(studentMasterlist.id, studentDbId));

    if (!existing) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    // Only Admin or the Faculty who uploaded can delete
    if (req.user?.role !== 'ADMIN' && existing.uploadedById !== req.user?.id) {
      return res.status(403).json({ error: 'You are not authorized to delete records uploaded by another faculty member.' });
    }

    await db.delete(studentMasterlist).where(eq(studentMasterlist.id, studentDbId));

    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: 'STUDENT_RECORD_DELETE',
      details: `Deleted student record for ${existing.studentId} (${existing.lastName}, ${existing.firstName})`,
    });

    return res.json({ success: true, message: 'Student record deleted successfully' });
  } catch (error: any) {
    console.error('Delete student record error:', error);
    return res.status(500).json({ error: 'Failed to delete student record' });
  }
});

export default router;
