import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

function generateDailyMessage(dateString: string): string {
  // Message templates with slots to fill
  const templates = [
    "You {action} today. {encouragement}",
    "{encouragement} You've {verb} through another day.",
    "Rest now. {future_action}",
    "{accomplishment}, and that's enough.",
    "Your {quality} matters. Take care of yourself.",
  ];

  const actions = [
    "did enough",
    "showed up",
    "made it through",
    "gave your best",
    "tried your hardest",
  ];

  const encouragements = [
    "Well done",
    "Good work",
    "You've got this",
    "Keep going",
    "Be proud",
  ];

  const verbs = [
    "made it",
    "pushed through",
    "powered through",
    "persevered",
    "carried on",
  ];

  const accomplishments = [
    "You showed up today",
    "You tried your best",
    "You kept going",
    "You made progress",
    "You did your part",
  ];

  const qualities = [
    "effort",
    "courage",
    "persistence",
    "strength",
    "resilience",
  ];

  const futureActions = [
    "Tomorrow is a fresh start.",
    "Tomorrow awaits your greatness.",
    "Tomorrow will be better.",
    "Tomorrow needs you.",
    "Tomorrow is a new opportunity.",
  ];

  // Use date string as seed for deterministic selection
  let seed = 0;
  for (let i = 0; i < dateString.length; i++) {
    seed = ((seed << 5) - seed) + dateString.charCodeAt(i);
    seed = seed & seed; // Convert to 32bit integer
  }

  const abs = Math.abs(seed);
  const templateIdx = abs % templates.length;
  const actionIdx = (abs + 1) % actions.length;
  const encouragementIdx = (abs + 2) % encouragements.length;
  const verbIdx = (abs + 3) % verbs.length;
  const accomplishmentIdx = (abs + 4) % accomplishments.length;
  const qualityIdx = (abs + 5) % qualities.length;
  const futureIdx = (abs + 6) % futureActions.length;

  let message = templates[templateIdx];
  message = message
    .replace("{action}", actions[actionIdx])
    .replace("{encouragement}", encouragements[encouragementIdx])
    .replace("{verb}", verbs[verbIdx])
    .replace("{accomplishment}", accomplishments[accomplishmentIdx])
    .replace("{quality}", qualities[qualityIdx])
    .replace("{future_action}", futureActions[futureIdx]);

  return message;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // Generate a daily emotional message
  app.get("/api/eod-message", (req, res) => {
    const date = new Date().toDateString();
    const message = generateDailyMessage(date);
    res.json({ message, date });
  });

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  return httpServer;
}
