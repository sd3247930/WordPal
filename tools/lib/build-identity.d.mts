export interface BuildIdentity {schemaVersion:number;version:string;versionCode:string;revision:string;sourceSha256:string;sourceFiles:number}
export function createBuildIdentity(root?:string):BuildIdentity
export function writeBuildIdentity(root:string,options:{platform:string;mode:string;localContent:boolean}):BuildIdentity&{platform:string;mode:string;localContent:boolean}
export function verifyBuildIdentity(read:(file:string)=>Uint8Array,expected?:BuildIdentity):BuildIdentity
