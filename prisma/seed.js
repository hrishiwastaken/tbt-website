const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seeding...");

  // Clean existing database
  await prisma.payment.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.therapistAvailability.deleteMany({});
  await prisma.therapist.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.testimonial.deleteMany({});

  console.log("Database cleared.");

  // 1. Create Services
  const services = await Promise.all([
    prisma.service.create({
      data: {
        name: "Individual Therapy",
        description: "A focused, one-on-one session designed to explore personal narratives, address psychological blocks, and cultivate self-awareness.",
        durationMinutes: 50,
        price: 180.00,
        slug: "individual-therapy",
      },
    }),
    prisma.service.create({
      data: {
        name: "Couples Counseling",
        description: "Structured mediation to enhance relational dynamics, dismantle communication barriers, and restore intimacy.",
        durationMinutes: 60,
        price: 220.00,
        slug: "couples-counseling",
      },
    }),
    prisma.service.create({
      data: {
        name: "Somatic Experiencing",
        description: "A body-centric therapy focusing on trauma resolution, releasing trapped nervous system stress, and restoring equilibrium.",
        durationMinutes: 50,
        price: 200.00,
        slug: "somatic-experiencing",
      },
    }),
    prisma.service.create({
      data: {
        name: "Mental Health Assessment",
        description: "Comprehensive diagnostic evaluations using standardized psychometric tools to guide customized treatment plans.",
        durationMinutes: 75,
        price: 250.00,
        slug: "mental-health-assessment",
      },
    }),
  ]);

  console.log(`Created ${services.length} services.`);

  // 2. Hash passwords for users
  const adminPassword = await bcrypt.hash("AdminPass123!", 10);
  const drMadhumatiPassword = await bcrypt.hash("DrMadhumati123!", 10);
  const drRohanPassword = await bcrypt.hash("DrRohan123!", 10);

  // 3. Create Users
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@madhumaticlinic.com",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  const drMadhumatiUser = await prisma.user.create({
    data: {
      email: "madhumati@madhumaticlinic.com",
      passwordHash: drMadhumatiPassword,
      role: "THERAPIST",
    },
  });

  const drRohanUser = await prisma.user.create({
    data: {
      email: "rohan@madhumaticlinic.com",
      passwordHash: drRohanPassword,
      role: "THERAPIST",
    },
  });

  console.log("Created accounts for Admin and Therapists.");

  // 4. Create Therapists
  const tMadhumati = await prisma.therapist.create({
    data: {
      userId: drMadhumatiUser.id,
      name: "Dr. Madhumati Halande",
      photo: "https://lh3.googleusercontent.com/aida-public/AB6AXuB9CrvSZcB5K_M90vuUuY0yIRpjRfTlD5htveoBkGT1tiPRqWCYQyMZkHxuHae4HvB2RSJYj543XHnA3Pfyq4yQLTLG3XAKMxDB8Sd_QSpnkQkUqT8rg2ToMe2lgwbFqsO41hMGydLIEvgsQl66reOSnuwLOXNj-tHCczkZdKcJf2J8nSvcWcCCFgR0qVkwjy-qBW3zySGXf3jslATREXcn4feCl_vVzhIXXuD89QPUU08xxRrMhvsdOTCMP2n_KjCXIxS5iGUO2_A", // Placeholder
      bio: "Dr. Madhumati Halande is a clinical psychologist with over 15 years of experience in mindfulness-based cognitive therapy and family counseling. She specializes in guiding individuals through existential challenges, stress mitigation, and emotional stabilization.",
      fees: 200.00,
      slug: "dr-madhumati-halande",
    },
  });

  const tRohan = await prisma.therapist.create({
    data: {
      userId: drRohanUser.id,
      name: "Dr. Rohan Gupta",
      photo: "https://lh3.googleusercontent.com/aida-public/AB6AXuB9CrvSZcB5K_M90vuUuY0yIRpjRfTlD5htveoBkGT1tiPRqWCYQyMZkHxuHae4HvB2RSJYj543XHnA3Pfyq4yQLTLG3XAKMxDB8Sd_QSpnkQkUqT8rg2ToMe2lgwbFqsO41hMGydLIEvgsQl66reOSnuwLOXNj-tHCczkZdKcJf2J8nSvcWcCCFgR0qVkwjy-qBW3zySGXf3jslATREXcn4feCl_vVzhIXXuD89QPUU08xxRrMhvsdOTCMP2n_KjCXIxS5iGUO2_A", // Placeholder
      bio: "Dr. Rohan Gupta specializes in Somatic Experiencing and trauma recovery. Focusing on the integration of neural regulation and cognitive pathways, he provides clients with practical, scientifically-grounded tools to resolve physiological fight-or-flight blockages.",
      fees: 180.00,
      slug: "dr-rohan-gupta",
    },
  });

  console.log("Created Therapist profiles.");

  // 5. Create availability slots (Mon to Fri: 9:00 to 17:00, with 1-hour increments)
  const weekdays = [1, 2, 3, 4, 5]; // Mon, Tue, Wed, Thu, Fri
  const timeSlots = [
    { start: "09:00", end: "10:00" },
    { start: "10:00", end: "11:00" },
    { start: "11:00", end: "12:00" },
    { start: "13:00", end: "14:00" },
    { start: "14:00", end: "15:00" },
    { start: "15:00", end: "16:00" },
    { start: "16:00", end: "17:00" },
  ];

  for (const therapist of [tMadhumati, tRohan]) {
    for (const day of weekdays) {
      for (const slot of timeSlots) {
        await prisma.therapistAvailability.create({
          data: {
            therapistId: therapist.id,
            dayOfWeek: day,
            startTime: slot.start,
            endTime: slot.end,
          },
        });
      }
    }
  }

  console.log("Populated weekly therapist availability slots.");

  // 6. Create Testimonials
  await prisma.testimonial.createMany({
    data: [
      {
        clientName: "Aarav Sharma",
        quote: "The environment is calm and feels like a sanctuary. Dr. Madhumati helped me reconcile long-standing emotional challenges through mindful, evidence-based steps.",
        status: "APPROVED",
        rating: 5,
      },
      {
        clientName: "Priyanka Roy",
        quote: "Dr. Rohan's somatic practices changed how I handle work-related stress. The physical deceleration exercises have had a lasting impact on my day-to-day life.",
        status: "APPROVED",
        rating: 5,
      },
      {
        clientName: "Vikram Malhotra",
        quote: "Incredibly professional and highly secure. The booking system was clean, and my session notes are locked down. Absolute privacy.",
        status: "APPROVED",
        rating: 5,
      },
    ],
  });

  console.log("Created testimonials.");

  // 7. Create Sample Clients
  const client1 = await prisma.client.create({
    data: {
      name: "Amit Patel",
      email: "amit.patel@example.com",
      phone: "+919876543210",
      dob: "1990-05-15",
      emergencyContact: "Sunita Patel (+919876543211)",
      gdprConsent: true,
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: "Neha Joshi",
      email: "neha.joshi@example.com",
      phone: "+919988776655",
      dob: "1994-11-22",
      emergencyContact: "Ramesh Joshi (+919988776654)",
      gdprConsent: true,
    },
  });

  console.log("Created test clients.");

  // 8. Create Sample Bookings and Payments
  // Booking 1: Dr. Madhumati with Amit Patel (Past Booking, Completed)
  const bookingDate1 = new Date();
  bookingDate1.setDate(bookingDate1.getDate() - 3);
  bookingDate1.setHours(10, 0, 0, 0); // 10:00 AM

  const booking1 = await prisma.booking.create({
    data: {
      therapistId: tMadhumati.id,
      serviceId: services[0].id, // Individual Therapy
      clientId: client1.id,
      dateTime: bookingDate1,
      durationMinutes: 50,
      amount: tMadhumati.fees,
      status: "COMPLETED",
      notes: "Client discussed initial anxiety triggers related to career transitions. Walked through mindfulness grounding exercises. Client responded positively.", // We will implement AES encryption on top of this in our actual server code
      paymentStatus: "PAID",
      razorpayOrderId: "order_mock123456789",
      razorpayPaymentId: "pay_mock123456789",
      invoiceNumber: "INV-2026-001",
    },
  });

  await prisma.payment.create({
    data: {
      bookingId: booking1.id,
      amount: tMadhumati.fees,
      status: "SUCCESS",
      razorpayPaymentId: "pay_mock123456789",
      invoiceNumber: "INV-2026-001",
    },
  });

  // Booking 2: Dr. Rohan with Neha Joshi (Upcoming Booking, Confirmed)
  const bookingDate2 = new Date();
  bookingDate2.setDate(bookingDate2.getDate() + 2);
  bookingDate2.setHours(14, 0, 0, 0); // 2:00 PM

  const booking2 = await prisma.booking.create({
    data: {
      therapistId: tRohan.id,
      serviceId: services[2].id, // Somatic Experiencing
      clientId: client2.id,
      dateTime: bookingDate2,
      durationMinutes: 50,
      amount: tRohan.fees,
      status: "CONFIRMED",
      paymentStatus: "PAID",
      razorpayOrderId: "order_mock987654321",
      razorpayPaymentId: "pay_mock987654321",
      invoiceNumber: "INV-2026-002",
    },
  });

  await prisma.payment.create({
    data: {
      bookingId: booking2.id,
      amount: tRohan.fees,
      status: "SUCCESS",
      razorpayPaymentId: "pay_mock987654321",
      invoiceNumber: "INV-2026-002",
    },
  });

  console.log("Created test bookings and transaction history.");
  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
