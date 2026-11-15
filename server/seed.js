import { db, generateCustomerCode } from './db.js';

const daysAgo = (days, hours = 0) =>
  new Date(Date.now() - days * 86400000 - hours * 3600000).toISOString();

export function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM customers').get().n;
  if (count > 0) return false;

  const insertReward = db.prepare(
    'INSERT INTO rewards (name, description, stamps_required, created_at) VALUES (?, ?, ?, ?)'
  );
  const insertTemplate = db.prepare(
    'INSERT INTO card_templates (name, description, stamps_required, reward_id, color, icon, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertCustomer = db.prepare(
    'INSERT INTO customers (code, name, phone, created_at) VALUES (?, ?, ?, ?)'
  );
  const insertCard = db.prepare(
    'INSERT INTO cards (customer_id, template_id, stamps, status, created_at, completed_at, redeemed_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertMovement = db.prepare(
    'INSERT INTO movements (customer_id, card_id, type, detail, created_at) VALUES (?, ?, ?, ?, ?)'
  );

  const seed = db.transaction(() => {
    const rSmoothie = insertReward.run('Smoothie gratis', 'Cualquier smoothie del menú, tamaño mediano', 8, daysAgo(60)).lastInsertRowid;
    const rFrappe = insertReward.run('Frappé gratis', 'Un frappé clásico a elección', 6, daysAgo(60)).lastInsertRowid;
    const rJugo = insertReward.run('Jugo natural gratis', 'Jugo natural de fruta de temporada', 10, daysAgo(60)).lastInsertRowid;

    const tSmoothie = insertTemplate.run('Smoothie Lovers', 'Juntá 8 sellos y llevate un smoothie gratis', 8, rSmoothie, 'strawberry', '🥤', daysAgo(60)).lastInsertRowid;
    const tFrappe = insertTemplate.run('Frappé Fan', 'Juntá 6 sellos y llevate un frappé gratis', 6, rFrappe, 'berry', '🧋', daysAgo(60)).lastInsertRowid;
    const tJugo = insertTemplate.run('Juice Club', 'Juntá 10 sellos y llevate un jugo natural gratis', 10, rJugo, 'kiwi', '🍹', daysAgo(60)).lastInsertRowid;

    const templates = {
      [tSmoothie]: { name: 'Smoothie Lovers', required: 8, reward: 'Smoothie gratis' },
      [tFrappe]: { name: 'Frappé Fan', required: 6, reward: 'Frappé gratis' },
      [tJugo]: { name: 'Juice Club', required: 10, reward: 'Jugo natural gratis' },
    };

    // [name, phone, templateId, stamps, status, registeredDaysAgo, previouslyRedeemed]
    const people = [
      ['Valentina Rojas', '8891-2345', tSmoothie, 7, 'active', 45, true],
      ['Carlos Mendoza', '8782-5566', tSmoothie, 8, 'reward_ready', 38, false],
      ['María Fernanda López', '8611-7788', tFrappe, 3, 'active', 30, true],
      ['Diego Castillo', '8954-1122', tJugo, 5, 'active', 25, false],
      ['Sofía Ramírez', '8733-9900', tFrappe, 6, 'reward_ready', 20, false],
      ['Andrés Vargas', '8822-3344', tSmoothie, 2, 'active', 12, false],
      ['Lucía Herrera', '8700-4455', tJugo, 0, 'active', 4, false],
      ['Javier Solano', '8866-6677', tFrappe, 4, 'active', 9, false],
    ];

    for (const [name, phone, templateId, stamps, status, regDays, redeemedBefore] of people) {
      const t = templates[templateId];
      const customerId = insertCustomer.run(generateCustomerCode(), name, phone, daysAgo(regDays)).lastInsertRowid;
      insertMovement.run(customerId, null, 'register', 'Cliente registrado', daysAgo(regDays));

      let stampClock = regDays - 1;

      if (redeemedBefore) {
        // A full earlier cycle: completed card already redeemed.
        const oldCard = insertCard.run(
          customerId, templateId, t.required, 'redeemed',
          daysAgo(regDays), daysAgo(Math.max(regDays - 15, 2)), daysAgo(Math.max(regDays - 16, 1))
        ).lastInsertRowid;
        for (let i = 1; i <= t.required; i++) {
          insertMovement.run(
            customerId, oldCard, 'stamp',
            `Sello ${i}/${t.required} — ${t.name}`, daysAgo(stampClock, i)
          );
          stampClock -= 1.5;
        }
        insertMovement.run(
          customerId, oldCard, 'redeem',
          `Canje: ${t.reward} — nueva tarjeta iniciada`, daysAgo(Math.max(regDays - 16, 1))
        );
        stampClock = Math.max(regDays - 17, 1);
      }

      const completedAt = status === 'reward_ready' ? daysAgo(1, 3) : null;
      const cardId = insertCard.run(
        customerId, templateId, stamps, status,
        daysAgo(redeemedBefore ? Math.max(regDays - 16, 1) : regDays),
        completedAt, null
      ).lastInsertRowid;

      for (let i = 1; i <= stamps; i++) {
        const when = i === stamps && status === 'reward_ready'
          ? daysAgo(1, 3)
          : daysAgo(Math.max(stampClock - i * 1.5, 0.2), i);
        const detail = `Sello ${i}/${t.required} — ${t.name}` +
          (i === t.required ? ' · ¡Tarjeta completada! 🎉' : '');
        insertMovement.run(customerId, cardId, 'stamp', detail, when);
      }
    }
  });

  seed();
  console.log('Base de datos inicializada con datos de ejemplo.');
  return true;
}
