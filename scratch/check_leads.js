import prisma from '../src/config/db.js';

async function listLeads() {
  const leads = await prisma.lead.findMany({
    take: 5,
    select: { id: true, name: true, mobile: true, status: true, qualificationStatus: true }
  });
  console.log('Sample leads in DB:', leads);
  process.exit(0);
}

listLeads().catch(console.error);
