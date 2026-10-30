import { normalizeSenderNumber } from "./phone";

const IPPANEL_BASE_URL =
  process.env.IPPANEL_BASE_URL || "https://edge.ippanel.com/v1";

type IpPanelMeta = {
  status?: boolean;
  message?: string;
  message_code?: string;
};

type IpPanelResponse = {
  data?: { message_outbox_ids?: number[] };
  meta?: IpPanelMeta;
};

export class IpPanelError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "IpPanelError";
  }
}

export const sendPatternSms = async (params: {
  recipient: string;
  code: string;
}): Promise<IpPanelResponse> => {
  const apiKey = process.env.IPPANEL_API_KEY;
  const patternCode = process.env.AUTH_OTP_PATTERN;
  const fromNumber = normalizeSenderNumber(
    process.env.IPPANEL_FROM_NUMBER || "",
  );

  if (!apiKey) {
    throw new IpPanelError("IPPANEL_API_KEY is not configured");
  }
  if (!patternCode) {
    throw new IpPanelError("AUTH_OTP_PATTERN is not configured");
  }
  if (!fromNumber || fromNumber === "+98") {
    throw new IpPanelError("IPPANEL_FROM_NUMBER is not configured");
  }

  let response: Response;
  try {
    response = await fetch(`${IPPANEL_BASE_URL}/api/send`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sending_type: "pattern",
        from_number: fromNumber,
        code: patternCode,
        recipients: [params.recipient],
        params: {
          code: params.code,
        },
      }),
    });
  } catch (err) {
    throw new IpPanelError(
      `IPPanel network error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const raw = await response.text();
  let body: IpPanelResponse | null = null;
  try {
    body = raw ? (JSON.parse(raw) as IpPanelResponse) : null;
  } catch {
    body = null;
  }

  if (!response.ok || body?.meta?.status === false) {
    const snippet = raw.replace(/\s+/g, " ").slice(0, 240);
    throw new IpPanelError(
      body?.meta?.message ||
        `Failed to send SMS via IPPanel (HTTP ${response.status})${
          snippet ? `: ${snippet}` : ""
        }`,
      response.status,
      body ?? { raw: snippet },
    );
  }

  return body || {};
};
