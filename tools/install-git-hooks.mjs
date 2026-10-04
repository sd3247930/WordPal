import {spawnSync} from 'node:child_process'
for(const args of [['rev-parse','--is-inside-work-tree'],['config','--local','core.hooksPath','.githooks']]){
 const result=spawnSync('git',args,{encoding:'utf8',windowsHide:true})
 if(result.status!==0){console.error('Git hooks were not installed. Initialize the repository and retry.');process.exit(1)}
}
console.log('Enabled versioned pre-commit, commit-message and pre-push purity checks.')
