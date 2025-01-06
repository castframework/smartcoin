import { ZodError, z } from "zod";
import { IsETHAddress } from "./validations";

const EnvConfigVariableName = "NEW_SMARTCOIN_IMPLEMENTATION_JSON_CONFIG";

const NewSmartcoinImplementationConfigSchema = z.object({
    NewOperatorsAddress: z.object({
        Registrar: z.string().refine(...IsETHAddress),
        Operation: z.string().refine(...IsETHAddress),
        Technical: z.string().refine(...IsETHAddress)
    }),
    Contracts: z.object({
        ImplementationArtifactName: z.string(),
    }),
    OutputFolder: z.string()
});

export type NewSmartcoinImplementationConfig = z.infer<typeof NewSmartcoinImplementationConfigSchema>;

export function GetNewSmartcoinImplementationConfig(): NewSmartcoinImplementationConfig {
    let configFromEnv = process.env[EnvConfigVariableName];

    try{
        return NewSmartcoinImplementationConfigSchema.parse(JSON.parse(configFromEnv || ""));
    } catch(e){
        if(e instanceof ZodError){
            throw `Invalid configuration : ${e.toString()}`;
        }
        
        throw e;
    }
}