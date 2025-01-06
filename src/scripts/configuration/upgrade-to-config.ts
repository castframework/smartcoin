import { ZodError, z } from "zod";
import { IsETHAddress } from "./validations";

const EnvConfigVariableName = "UPGRADE_TO_JSON_CONFIG";

const UpgradeToConfigSchema = z.object({
    RegistrarAddress: z.string().refine(...IsETHAddress),
    ImplementationArtifactName: z.string(),
    ProxyAddress: z.string().refine(...IsETHAddress)
});

type UpgradeToConfig = z.infer<typeof UpgradeToConfigSchema>;

export function GetUpgradeToConfig(): UpgradeToConfig {
    let configFromEnv = process.env[EnvConfigVariableName];

    try{
        return UpgradeToConfigSchema.parse(JSON.parse(configFromEnv || ""));
    } catch(e){
        if(e instanceof ZodError){
            throw `Invalid configuration : ${e.toString()}`;
        }
 
        throw e;
    }
}