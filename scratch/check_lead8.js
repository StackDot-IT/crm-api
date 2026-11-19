import prisma from '../src/config/db.js';

async function check() {
  const lead8 = await prisma.lead.findUnique({
    where: { id: 8 },
    select: { id: true, name: true, mobile: true, email: true, companyId: true, isDeleted: true }
  });
  console.log('Lead 8:', lead8);

  const leadsWithEmail = await prisma.lead.findMany({
    where: { email: 'admin@apexhealth.org', companyId: lead8?.companyId },
    select: { id: true, name: true, mobile: true, email: true, isDeleted: true }
  });
  console.log('Leads with email admin@apexhealth.org:', leadsWithEmail);

  process.exit(0);
}

check().catch(console.error);
