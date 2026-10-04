export interface Finding {path:string;category:string;line?:number;localOnly?:boolean;commit?:string}
export interface AuditResult {
 mode:string
 counts:{publicFiles:number;publicBytes:number;localFiles:number;localBytes:number;commits:number}
 findings:Finding[]
 localFindings:Finding[]
}
export function forbiddenPath(name:string):boolean
export function imageMetadata(data:Buffer,extension:string):string[]
export function scanBytes(name:string,data:Buffer,options?:{maxBytes?:number;localOnly?:boolean}):Finding[]
export function runAudit(options:{root:string;staged?:boolean;history?:boolean;includeLocalOnly?:boolean;messageFile?:string;maxBytes?:number}):AuditResult
