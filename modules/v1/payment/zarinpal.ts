import ZarinPal from "zarinpal-node-sdk";

const minimumToman = 1000;

export const getZarinpalClient = () => {
  const merchantId = process.env.ZARINPAL_MERCHANT_ID;
  const callbackUrl = process.env.ZARINPAL_CALLBACK_URL;
  if (!merchantId || !callbackUrl) {
    throw new Error("Zarinpal is not configured");
  }

  const sandbox = process.env.ZARINPAL_SANDBOX === "true";
  const client = new ZarinPal({ merchantId, sandbox });
  return { client, callbackUrl };
};

export const requestZarinpalPayment = async (amount: number, description: string) => {
  if (!Number.isInteger(amount) || amount < minimumToman) {
    throw new Error(`Amount must be at least ${minimumToman} toman`);
  }

  const { client, callbackUrl } = getZarinpalClient();
  const payload = {
    amount,
    callback_url: callbackUrl,
    description,
    currency: "IRT" as const,
  };
  const response = await client.payments.create(payload);
  const authority = response?.data?.authority as string | undefined;
  const code = Number(response?.data?.code);

  if (code !== 100 || !authority) {
    throw new Error(response?.data?.message || "Zarinpal request failed");
  }

  return {
    authority,
    url: client.payments.getRedirectUrl(authority),
  };
};

export const verifyZarinpalPayment = async (amount: number, authority: string) => {
  const { client } = getZarinpalClient();
  const response = await client.verifications.verify({ amount, authority });
  const code = Number(response?.data?.code);
  const refId = response?.data?.ref_id;

  return {
    settled: code === 100 || code === 101,
    code,
    refId: refId === undefined || refId === null ? null : String(refId),
    message: (response?.data?.message as string | undefined) ?? null,
  };
};
