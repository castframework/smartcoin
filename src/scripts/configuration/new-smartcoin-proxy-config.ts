import { ZodError, z } from "zod";
import { IsETHAddress } from "./validations";

const EnvConfigVariableName = "NEW_SMARTCOIN_PROXY_JSON_CONFIG";

const NewSmartcoinProxyConfigSchema = z.object({
    Contracts: z.object({
        ImplementationArtifactName: z.string(),
        Symbol: z.string(),
        FullName: z.string(),
        ImplementationAddress: z.string().refine(...IsETHAddress),
    }),
    OutputFolder: z.string()
});

export type NewSmartcoinProxyConfig = z.infer<typeof NewSmartcoinProxyConfigSchema>;

export function GetNewSmartcoinProxyConfig(): NewSmartcoinProxyConfig {
    let configFromEnv = process.env[EnvConfigVariableName];

    try{
        return NewSmartcoinProxyConfigSchema.parse(JSON.parse(configFromEnv || ""));
    } catch(e){
        if(e instanceof ZodError){
            throw `Invalid configuration : ${e.toString()}`;
        }
 
        throw e;
    }
}