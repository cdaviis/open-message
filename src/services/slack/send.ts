import fs from 'node:fs/promises';
import ky from 'ky';

const SLACK_POST_MESSAGE_URL = 'https://slack.com/api/chat.postMessage';
const SLACK_UPLOAD_URL_EXTERNAL = 'https://slack.com/api/files.getUploadURLExternal';
const SLACK_COMPLETE_UPLOAD_URL = 'https://slack.com/api/files.completeUploadExternal';

export interface SlackFileUpload {
  path: string;
  filename?: string;
  title?: string;
  alt_text?: string;
}

async function post(
  url: string,
  body: unknown,
  headers: Record<string, string>
): Promise<unknown> {
  const response = await ky.post(url, { json: body, headers, throwHttpErrors: true });
  return response.json();
}

export async function sendMessage(
  message: Record<string, unknown>,
  destination: Record<string, unknown>,
  token: string
): Promise<unknown> {
  const opts = (destination.settings ?? destination.slack ?? destination) as Record<string, unknown>;
  const channel = opts.channel as string;
  const files = opts.files as SlackFileUpload[] | undefined;

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  if (files && files.length > 0) {
    await uploadFiles(files, channel, token);
  }

  const payload: Record<string, unknown> = { channel, ...message };
  if (opts.thread_ts != null) payload.thread_ts = opts.thread_ts;
  const result = (await post(SLACK_POST_MESSAGE_URL, payload, authHeaders)) as Record<string, unknown>;

  if (!result.ok) {
    throw new Error(`Slack API error: ${result.error ?? 'unknown error'}`);
  }

  return result;
}

async function uploadFiles(
  files: SlackFileUpload[],
  channel: string,
  token: string
): Promise<void> {
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  for (const file of files) {
    const content = await fs.readFile(file.path);
    const filename = file.filename ?? file.path.split('/').pop() ?? 'file';
    const length = content.byteLength;

    const urlResult = (await post(
      SLACK_UPLOAD_URL_EXTERNAL,
      { filename, length },
      authHeaders
    )) as Record<string, unknown>;

    if (!urlResult.ok) {
      throw new Error(`Slack file upload error (getUploadURL): ${urlResult.error ?? 'unknown'}`);
    }

    const uploadUrl = urlResult.upload_url as string;
    const fileId = urlResult.file_id as string;

    await post(uploadUrl, content, { 'Content-Type': 'application/octet-stream' });

    const completeResult = (await post(
      SLACK_COMPLETE_UPLOAD_URL,
      {
        files: [{ id: fileId, title: file.title ?? filename }],
        channel_id: channel,
        ...(file.alt_text ? { initial_comment: file.alt_text } : {}),
      },
      authHeaders
    )) as Record<string, unknown>;

    if (!completeResult.ok) {
      throw new Error(`Slack file upload error (completeUpload): ${completeResult.error ?? 'unknown'}`);
    }
  }
}
