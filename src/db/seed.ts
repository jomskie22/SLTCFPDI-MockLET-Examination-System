import { db, createPool, initDatabaseSchema } from './index.ts';
import { users, categories, topics, questions, questionChoices, examinations, examQuestions, auditLogs, examAttempts, examineeAnswers, studentMasterlist, examRequests } from './schema.ts';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

export async function seedDatabase() {
  try {
    await initDatabaseSchema();
    console.log('Checking database seeding status...');

    // Ensure columns exist
    try {
      const pool = createPool();
      await pool.query('ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS allow_retake BOOLEAN DEFAULT FALSE;');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS faculty_remarks TEXT;');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS faculty_recommendation TEXT;');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS evaluator_name TEXT;');
    } catch (migErr) {
      console.warn('Migration alter table notice:', migErr);
    }

    // 1. Check if categories exist
    const existingCategories = await db.select().from(categories);
    if (existingCategories.length === 0) {
      console.log('Seeding categories and topics...');
      const genEd = await db.insert(categories).values({
        name: 'General Education',
        code: 'GENED',
        description: 'Covers English, Filipino, Mathematics, Natural Science, and Social Sciences.',
      }).returning();

      const profEd = await db.insert(categories).values({
        name: 'Professional Education',
        code: 'PROFED',
        description: 'Covers Teaching Profession, Child Development, Curriculum Development, Educational Technology, and Assessment of Learning.',
      }).returning();

      const majorEng = await db.insert(categories).values({
        name: 'Major Subject - English',
        code: 'MAJOR_ENG',
        description: 'Covers Linguistics, Literature, Language Curriculum, and Teaching English as a Second Language.',
      }).returning();

      const majorMath = await db.insert(categories).values({
        name: 'Major Subject - Mathematics',
        code: 'MAJOR_MATH',
        description: 'Covers College Algebra, Geometry, Trigonometry, Calculus, Statistics, and Math Teaching Strategies.',
      }).returning();

      // Topics
      await db.insert(topics).values([
        { categoryId: genEd[0].id, name: 'English Grammar & Structure', description: 'Subject-verb agreement, tenses, syntax.' },
        { categoryId: genEd[0].id, name: 'Philippine & World Literature', description: 'Literary figures, genres, critical analysis.' },
        { categoryId: genEd[0].id, name: 'General Mathematics', description: 'Arithmetic, percentage, proportions, basic algebra.' },
        { categoryId: genEd[0].id, name: 'Natural Science', description: 'Biology, chemistry, physics, earth science.' },
        { categoryId: genEd[0].id, name: 'Philippine History & Governance', description: 'Constitution, history, social sciences.' },

        { categoryId: profEd[0].id, name: 'Child & Adolescent Development', description: 'Piaget, Erikson, Vygotsky development theories.' },
        { categoryId: profEd[0].id, name: 'Principles of Teaching & Pedagogy', description: 'Instructional planning, methodologies, classroom management.' },
        { categoryId: profEd[0].id, name: 'Assessment of Learning', description: 'Formative/summative evaluation, rubrics, item analysis.' },
        { categoryId: profEd[0].id, name: 'The Teaching Profession & Ethics', description: 'RA 7836, Code of Ethics for Professional Teachers.' },

        { categoryId: majorEng[0].id, name: 'Linguistics & Structure of English', description: 'Phonology, morphology, syntax, semantics.' },
        { categoryId: majorEng[0].id, name: 'Literary Criticism & World Lit', description: 'Critiques, prose, poetry, world classics.' },

        { categoryId: majorMath[0].id, name: 'College Algebra & Functions', description: 'Polynomials, quadratic equations, functions.' },
        { categoryId: majorMath[0].id, name: 'Geometry & Trigonometry', description: 'Geometric proofs, triangles, trigonometric identities.' },
      ]);
    }

    // 2. Check if default accounts exist
    const existingUsers = await db.select().from(users);
    let adminUser, facultyUser, examineeUser;

    if (existingUsers.length === 0) {
      console.log('Seeding default system users...');
      const adminHash = await bcrypt.hash('admin123', 10);
      const facultyHash = await bcrypt.hash('faculty123', 10);
      const studentHash = await bcrypt.hash('student123', 10);

      [adminUser] = await db.insert(users).values({
        uid: 'sltc_admin_001',
        email: 'admin@sltcfpdi.edu.ph',
        passwordHash: adminHash,
        fullName: 'Dr. Maria Santos (Admin)',
        role: 'ADMIN',
        department: 'College of Education / Dean Office',
        studentId: 'ADM-2026-01',
      }).returning();

      [facultyUser] = await db.insert(users).values({
        uid: 'sltc_faculty_001',
        email: 'faculty@sltcfpdi.edu.ph',
        passwordHash: facultyHash,
        fullName: 'Prof. Juan Dela Cruz (Faculty)',
        role: 'FACULTY',
        department: 'Department of Teacher Education',
        studentId: 'FAC-2026-05',
      }).returning();

      [examineeUser] = await db.insert(users).values({
        uid: 'sltc_student_001',
        email: 'student@sltcfpdi.edu.ph',
        passwordHash: studentHash,
        fullName: 'Ana Clara Reyes (Examinee)',
        role: 'EXAMINEE',
        studentId: 'SLPD-2022-COL-0841',
        majorSubject: 'General Education',
        yearLevel: '4th Year BSED',
        contactNumber: '09171234567',
      }).returning();
    } else {
      adminUser = existingUsers.find(u => u.role === 'ADMIN') || existingUsers[0];
      facultyUser = existingUsers.find(u => u.role === 'FACULTY') || existingUsers[0];
      examineeUser = existingUsers.find(u => u.role === 'EXAMINEE') || existingUsers[0];

      // Auto-migrate legacy format if present
      if (examineeUser && examineeUser.studentId === '2022-SLTC-0841') {
        await db.update(users).set({ studentId: 'SLPD-2022-COL-0841' }).where(eq(users.id, examineeUser.id));
        examineeUser.studentId = 'SLPD-2022-COL-0841';
      }
    }

    // 3. Check Questions
    const existingQuestions = await db.select().from(questions);
    if (existingQuestions.length === 0) {
      console.log('Seeding initial LET questions with choices and references...');
      const catList = await db.select().from(categories);
      const genEdCat = catList.find(c => c.code === 'GENED') || catList[0];
      const profEdCat = catList.find(c => c.code === 'PROFED') || catList[0];
      const engCat = catList.find(c => c.code === 'MAJOR_ENG') || catList[0];
      const mathCat = catList.find(c => c.code === 'MAJOR_MATH') || catList[0];

      // Sample Question 1 - GenEd English
      const [q1] = await db.insert(questions).values({
        categoryId: genEdCat.id,
        questionText: 'Neither the teacher nor the students ____ present at the regional LET seminar yesterday.',
        explanation: 'According to the rule of proximity for "neither... nor", the verb agrees with the subject closest to it ("students", which is plural, taking "were").',
        pointValue: 1,
        sourceReference: 'PRC LET General Education Reviewer 2024, Page 32 - English Grammar',
        difficulty: 'Medium',
        createdById: facultyUser.id,
      }).returning();

      await db.insert(questionChoices).values([
        { questionId: q1.id, choiceLabel: 'A', choiceText: 'was', isCorrect: false },
        { questionId: q1.id, choiceLabel: 'B', choiceText: 'were', isCorrect: true },
        { questionId: q1.id, choiceLabel: 'C', choiceText: 'is', isCorrect: false },
        { questionId: q1.id, choiceLabel: 'D', choiceText: 'are', isCorrect: false },
      ]);

      // Sample Question 2 - GenEd Science
      const [q2] = await db.insert(questions).values({
        categoryId: genEdCat.id,
        questionText: 'Which organelle is known as the powerhouse of the cell, responsible for producing ATP through cellular respiration?',
        explanation: 'Mitochondria generate most of the chemical energy needed to power the cell\'s biochemical reactions.',
        pointValue: 1,
        sourceReference: 'SLTCFPDI Natural Science LET Board Review Manual, Module 2, p. 18',
        difficulty: 'Easy',
        createdById: facultyUser.id,
      }).returning();

      await db.insert(questionChoices).values([
        { questionId: q2.id, choiceLabel: 'A', choiceText: 'Ribosome', isCorrect: false },
        { questionId: q2.id, choiceLabel: 'B', choiceText: 'Endoplasmic Reticulum', isCorrect: false },
        { questionId: q2.id, choiceLabel: 'C', choiceText: 'Mitochondrion', isCorrect: true },
        { questionId: q2.id, choiceLabel: 'D', choiceText: 'Golgi Apparatus', isCorrect: false },
      ]);

      // Sample Question 3 - ProfEd Piaget
      const [q3] = await db.insert(questions).values({
        categoryId: profEdCat.id,
        questionText: 'According to Jean Piaget’s Cognitive Development Theory, at what stage does a child develop abstract reasoning and hypothetical thinking?',
        explanation: 'The Formal Operational stage (ages 12+) is characterized by abstract thinking, logical reasoning, and systematic problem-solving.',
        pointValue: 1,
        sourceReference: 'Professional Education Principles of Learning & Development, Lorimar Publishing, p. 77',
        difficulty: 'Hard',
        createdById: facultyUser.id,
      }).returning();

      await db.insert(questionChoices).values([
        { questionId: q3.id, choiceLabel: 'A', choiceText: 'Sensorimotor Stage', isCorrect: false },
        { questionId: q3.id, choiceLabel: 'B', choiceText: 'Preoperational Stage', isCorrect: false },
        { questionId: q3.id, choiceLabel: 'C', choiceText: 'Concrete Operational Stage', isCorrect: false },
        { questionId: q3.id, choiceLabel: 'D', choiceText: 'Formal Operational Stage', isCorrect: true },
      ]);

      // Sample Question 4 - ProfEd RA 7836
      const [q4] = await db.insert(questions).values({
        categoryId: profEdCat.id,
        questionText: 'What is Republic Act 7836 otherwise known as?',
        explanation: 'RA 7836 is the Philippine Teachers Professionalization Act of 1994, establishing the Board for Professional Teachers.',
        pointValue: 1,
        sourceReference: 'Philippine Educational Laws and the Teaching Profession, 2023 Edition, p. 104',
        difficulty: 'Medium',
        createdById: adminUser.id,
      }).returning();

      await db.insert(questionChoices).values([
        { questionId: q4.id, choiceLabel: 'A', choiceText: 'Magna Carta for Public School Teachers', isCorrect: false },
        { questionId: q4.id, choiceLabel: 'B', choiceText: 'Philippine Teachers Professionalization Act of 1994', isCorrect: true },
        { questionId: q4.id, choiceLabel: 'C', choiceText: 'Governance of Basic Education Act', isCorrect: false },
        { questionId: q4.id, choiceLabel: 'D', choiceText: 'Higher Education Act of 1994', isCorrect: false },
      ]);

      // Sample Question 5 - Major Math
      const [q5] = await db.insert(questions).values({
        categoryId: mathCat.id,
        questionText: 'If 3x + 7 = 22, what is the value of 5x - 4?',
        explanation: '3x = 15 => x = 5. Therefore, 5(5) - 4 = 25 - 4 = 21.',
        pointValue: 1,
        sourceReference: 'SLTCFPDI Major Mathematics Reviewer, College Algebra Section, item 12',
        difficulty: 'Easy',
        createdById: facultyUser.id,
      }).returning();

      await db.insert(questionChoices).values([
        { questionId: q5.id, choiceLabel: 'A', choiceText: '19', isCorrect: false },
        { questionId: q5.id, choiceLabel: 'B', choiceText: '21', isCorrect: true },
        { questionId: q5.id, choiceLabel: 'C', choiceText: '25', isCorrect: false },
        { questionId: q5.id, choiceLabel: 'D', choiceText: '26', isCorrect: false },
      ]);

      // Sample Question 6 - Major English
      const [q6] = await db.insert(questions).values({
        categoryId: engCat.id,
        questionText: 'Which figure of speech is exemplified in the statement: "The wind whispered secrets through the ancient pine trees"?',
        explanation: 'Personification gives human qualities or actions to non-human entities.',
        pointValue: 1,
        sourceReference: 'SLTCFPDI Major English Literature & Stylistics Handout, p. 14',
        difficulty: 'Medium',
        createdById: facultyUser.id,
      }).returning();

      await db.insert(questionChoices).values([
        { questionId: q6.id, choiceLabel: 'A', choiceText: 'Metaphor', isCorrect: false },
        { questionId: q6.id, choiceLabel: 'B', choiceText: 'Personification', isCorrect: true },
        { questionId: q6.id, choiceLabel: 'C', choiceText: 'Hyperbole', isCorrect: false },
        { questionId: q6.id, choiceLabel: 'D', choiceText: 'Simile', isCorrect: false },
      ]);

      // 4. Create Initial Published Mock Examination
      const allQ = await db.select().from(questions);

      const [mockExam1] = await db.insert(examinations).values({
        title: 'SLTCFPDI Official LET Pre-Board Mock Exam 2026 (GenEd & ProfEd)',
        description: 'Comprehensive simulation of the Licensure Examination for Teachers covering General Education and Professional Education concepts. Time limit: 120 minutes.',
        categoryId: genEdCat.id,
        durationMinutes: 120,
        passPercentage: 75,
        totalQuestions: allQ.length,
        randomizeQuestions: true,
        randomizeChoices: true,
        isPublished: true,
        createdById: adminUser.id,
      }).returning();

      for (let i = 0; i < allQ.length; i++) {
        await db.insert(examQuestions).values({
          examId: mockExam1.id,
          questionId: allQ[i].id,
          orderIndex: i + 1,
        });
      }

      // Add a sample attempt for historical analytics display
      const [sampleAttempt] = await db.insert(examAttempts).values({
        examId: mockExam1.id,
        userId: examineeUser.id,
        score: 5,
        totalPoints: 6,
        percentage: '83.33',
        passed: true,
        startedAt: new Date(Date.now() - 3600000 * 24),
        submittedAt: new Date(Date.now() - 3600000 * 22),
        timeSpentSeconds: 4200,
        status: 'SUBMITTED',
      }).returning();

      // Log initial seed in audit
      await db.insert(auditLogs).values({
        userId: adminUser.id,
        action: 'SYSTEM_SEED',
        details: 'Initial database seeding for SLTCFPDI LET Mock Examination system successfully executed.',
      });

      // Seed official student masterlist
      console.log('Seeding official student masterlist...');
      await db.insert(studentMasterlist).values([
        {
          studentId: 'SLPD-2022-COL-0841',
          lastName: 'Reyes',
          firstName: 'Ana Clara',
          middleName: 'Morales',
          course: 'BEED General Education',
          yearGraduated: '2025',
          uploadedById: facultyUser.id,
        },
        {
          studentId: 'SLPD-2024-COL-0190',
          lastName: 'Gomez',
          firstName: 'Elena Marie',
          middleName: 'Castro',
          course: 'BSED Major in English',
          yearGraduated: '2026',
          uploadedById: facultyUser.id,
        },
        {
          studentId: 'SLPD-2023-COL-0112',
          lastName: 'Bautista',
          firstName: 'John Mark',
          middleName: 'Salazar',
          course: 'BSED Major in English',
          yearGraduated: '2026',
          uploadedById: facultyUser.id,
        },
        {
          studentId: 'SLPD-2023-COL-0245',
          lastName: 'Cruz',
          firstName: 'Rochelle',
          middleName: 'Pascual',
          course: 'BSED Major in Mathematics',
          yearGraduated: '2026',
          uploadedById: adminUser.id,
        },
        {
          studentId: 'SLPD-2024-COL-0309',
          lastName: 'Mendoza',
          firstName: 'Carlo',
          middleName: 'Dizon',
          course: 'BSED Major in Science',
          yearGraduated: '2026',
          uploadedById: facultyUser.id,
        },
        {
          studentId: 'SLPD-2024-COL-0418',
          lastName: 'Santos',
          firstName: 'Katrina',
          middleName: 'Luna',
          course: 'BEED Early Childhood Education',
          yearGraduated: '2026',
          uploadedById: adminUser.id,
        },
      ]);

      // Seed initial exam clearance request for the demo examinee
      await db.insert(examRequests).values({
        userId: examineeUser.id,
        studentId: examineeUser.studentId || 'SLPD-2022-COL-0841',
        examId: mockExam1.id,
        status: 'APPROVED',
        requestNotes: 'Official clearance request for Pre-Board MockLET batch 2026.',
        reviewNotes: 'Verified official graduating student in masterlist. Approved for pre-board mock examination.',
        reviewedById: adminUser.id,
        reviewedAt: new Date(),
      });

      console.log('Database seeded successfully!');
    }

    // Ensure SLPD-2024-COL-0190 is present in masterlist even if database was previously seeded
    const existing0190 = await db.select().from(studentMasterlist).where(eq(studentMasterlist.studentId, 'SLPD-2024-COL-0190'));
    if (existing0190.length === 0) {
      await db.insert(studentMasterlist).values({
        studentId: 'SLPD-2024-COL-0190',
        lastName: 'Gomez',
        firstName: 'Elena Marie',
        middleName: 'Castro',
        course: 'BSED Major in English',
        yearGraduated: '2026',
        uploadedById: 2,
      });
    }

    // Ensure legacy IDs in studentMasterlist are migrated to SLPD format
    const allMaster = await db.select().from(studentMasterlist);
    for (const record of allMaster) {
      if (record.studentId.includes('SLTC')) {
        const parts = record.studentId.split('-');
        // 2022-SLTC-0841 -> SLPD-2022-COL-0841
        if (parts.length === 3) {
          const newId = `SLPD-${parts[0]}-COL-${parts[2]}`;
          await db.update(studentMasterlist).set({ studentId: newId }).where(eq(studentMasterlist.id, record.id));
        }
      }
    }

    // Ensure legacy IDs in examRequests are migrated to SLPD format
    const allReqs = await db.select().from(examRequests);
    for (const reqRecord of allReqs) {
      if (reqRecord.studentId.includes('SLTC')) {
        const parts = reqRecord.studentId.split('-');
        if (parts.length === 3) {
          const newId = `SLPD-${parts[0]}-COL-${parts[2]}`;
          await db.update(examRequests).set({ studentId: newId }).where(eq(examRequests.id, reqRecord.id));
        }
      }
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
