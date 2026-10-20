import 'server-only';
import type { ZodTypeAny } from 'zod';
import {
  educationSchema,
  experienceSchema,
  seriesSchema,
  skillSchema,
  topicSchema,
} from '@/lib/validation/schemas';
import {
  deleteEducation,
  deleteExperience,
  deleteSeries,
  deleteSkill,
  deleteTopic,
  saveEducation,
  saveExperience,
  saveSeries,
  saveSkill,
  saveTopic,
} from './content';

type Handler = {
  schema: ZodTypeAny;
  save: (input: never, userId: string, id?: string) => Promise<unknown>;
  remove: (id: string, userId: string) => Promise<unknown>;
};

/** Small editable collections managed on the admin "Experience" screen. */
export const COLLECTIONS: Record<string, Handler> = {
  experience: {
    schema: experienceSchema,
    save: saveExperience as Handler['save'],
    remove: deleteExperience,
  },
  education: {
    schema: educationSchema,
    save: saveEducation as Handler['save'],
    remove: deleteEducation,
  },
  skills: { schema: skillSchema, save: saveSkill as Handler['save'], remove: deleteSkill },
  topics: { schema: topicSchema, save: saveTopic as Handler['save'], remove: deleteTopic },
  series: { schema: seriesSchema, save: saveSeries as Handler['save'], remove: deleteSeries },
};
