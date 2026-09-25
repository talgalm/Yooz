import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { CollageJob, type ICollageJob } from '../models/CollageJob';
import { TEMPLATES, DEFAULT_TEMPLATE_ID, type TemplateMeta } from '../routes/collage';

const LAMBDA_FN = process.env.COLLAGE_LAMBDA_FUNCTION_NAME || '';
const lambda = new LambdaClient({ region: process.env.AWS_REGION || 'eu-west-1' });

export function getEncodeQueueDepth(): number { return 0; }
export function getEncodeSlotsInUse(): number { return 0; }

export async function updateCollageJobProgress(
  jobId: string,
  patch: Partial<Pick<ICollageJob, 'phase' | 'percent' | 'message' | 'error' | 'resultUrl' | 'isVideo'>>,
): Promise<void> {
  const job = await CollageJob.findOne({ jobId });
  if (!job) return;
  if (job.phase === 'done' || job.phase === 'error') return;
  if (patch.percent !== undefined) {
    job.percent = Math.max(job.percent, patch.percent);
  }
  if (patch.phase !== undefined) job.phase = patch.phase;
  if (patch.message !== undefined) job.message = patch.message;
  if (patch.error !== undefined) job.error = patch.error;
  if (patch.resultUrl !== undefined) job.resultUrl = patch.resultUrl;
  if (patch.isVideo !== undefined) job.isVideo = patch.isVideo;
  await job.save();
}

export async function runCollageEncode(jobId: string): Promise<void> {
  if (!LAMBDA_FN) {
    await updateCollageJobProgress(jobId, {
      phase: 'error',
      error: 'COLLAGE_LAMBDA_FUNCTION_NAME not configured',
      message: 'שגיאת שרת',
    });
    return;
  }
  try {
    await lambda.send(
      new InvokeCommand({
        FunctionName: LAMBDA_FN,
        InvocationType: 'Event',
        Payload: Buffer.from(JSON.stringify({ jobId })),
      }),
    );
  } catch (err) {
    console.error(`[collage] lambda invoke failed for ${jobId}:`, err);
    await updateCollageJobProgress(jobId, {
      phase: 'error',
      error: err instanceof Error ? err.message : 'Lambda invoke failed',
      message: 'שגיאת שרת',
    });
  }
}

export function scheduleCollageEncode(jobId: string): void {
  void runCollageEncode(jobId);
}

export function resolveTemplate(templateId: string | undefined): TemplateMeta {
  const id = templateId && TEMPLATES[templateId] ? templateId : DEFAULT_TEMPLATE_ID;
  return TEMPLATES[id];
}

export function requiredImageCount(templateId: string | undefined): number {
  return resolveTemplate(templateId).scenes.length;
}
