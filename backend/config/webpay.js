import * as tbk from "transbank-sdk";

const sdk = tbk.default ?? tbk;
const { WebpayPlus, Options, IntegrationApiKeys, IntegrationCommerceCodes, Environment } = sdk;

export function getWebpayTransaction() {
  const isProd = process.env.TBK_ENVIRONMENT === "production";
  const options = isProd
    ? new Options(process.env.TBK_COMMERCE_CODE, process.env.TBK_API_KEY, Environment.Production)
    : new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration);
  return new WebpayPlus.Transaction(options);
}