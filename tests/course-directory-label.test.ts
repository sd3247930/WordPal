import test from 'node:test'
import assert from 'node:assert/strict'
import {installationLabel} from '../src/services/content/CourseDirectory'
import {installationStatus} from '../src/services/content/ContentRegistry'

test('installationLabel 覆盖四种安装态（安装态唯一真源）',()=>{
 const id='starter'
 installationStatus[id]='installing';assert.equal(installationLabel(id),'安装中…')
 installationStatus[id]='failed';assert.equal(installationLabel(id),'安装失败')
 installationStatus[id]='notInstalled';assert.equal(installationLabel(id),'未安装')
 delete installationStatus[id];assert.equal(installationLabel(id),'已安装')
})
