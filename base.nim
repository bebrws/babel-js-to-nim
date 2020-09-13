from sequtils import map
from strutils import join
import utils
import sugar
import nre
import tables
import hashes
import parseutils


type
  NativeValue* = ref object of RootObj
  ObjType* = enum
    OTNumber
    OTString
    OTBoolean
    OTFunction
    OTUndefined
    OTArray
    OTObject
  Obj* = ref object
    env*: Env
    lets*: Env
    case objType*: ObjType
      of OTNumber: numValue*: float
      of OTString: strValue*: string
      of OTBoolean: boolValue*: bool
      of OTArray: elements*: seq[Obj]
      of OTFunction:
          function*: proc(args: seq[Obj]): Obj
      of OTObject:
          discard
      of OTUndefined:
        discard
        
  ApplyFunction* =
    proc (fn: Obj, arguments: seq[Obj], env: var Env): Obj
  Env* = ref object
    store*: Table[string, Obj]
    outer*: Env


type
    ObjectFunction* =
        proc(args: seq[Obj]): Obj


proc inspect*(obj: Obj): string =
  if obj == nil:
    return ""
  case obj.objType:
    of OTNumber: return $obj.numValue
    of OTString: return obj.strValue
    of OTBoolean:
      if obj.boolValue: return "true" else: return "false"
    of OTUndefined: return "undefined"
    of OTArray:
      return "array"
    of OTObject:
      return "object"
    of OTFunction:
      return "function"

proc `$`*(obj: Obj): string =
  return inspect(obj)

proc compareObj*(a: Obj, b: Obj): bool =
  if a.objType != b.objType:
    return false
  return case a.objType:
    of OTNumber:
      a.numValue == b.numValue
    of OTString:
      a.strValue == b.strValue
    of OTBoolean:
      a.boolValue == b.boolValue
    of OTUndefined:
      a.objType == b.objType
    else:
      false

proc newGlobalEnv*(): Env =
  return Env(store: initTable[string, Obj]())

proc newEnv*(s: Obj): Env =
  return Env(outer: s.env, store: initTable[string, Obj]())

proc findEnvWithVar*(env: Env, name: string): Env =
  if env == nil:
    return nil

  if name in env.store:
    return env
  else:
    if env.outer != nil:
      return findEnvWithVar(env.outer, name)
    else:
      return nil

proc setVarInEnv*(env: Env, name: string, value: Obj): void =
  if name in env.store:
    env.store[name] = value
  else:
    let envWithVar = findEnvWithVar(env.outer, name)
    if envWithVar != nil:
      setVarInEnv(envWithVar, name, value)
    else:
      env.store[name] = value

proc setVar*(s: Obj, name: string, value: Obj): void =
  setVarInEnv(s.env, name, value)

proc setLet*(s: Obj, name: string, value: Obj): void =
  setVarInEnv(s.lets, name, value)  

proc getVar*(s: Obj, name: string): Obj =
  let env:Env = findEnvWithVar(s.lets, name)
  if env != nil:
      return env.store[name]
  else:
      let envv:Env = findEnvWithVar(s.env, name)
      if envv != nil:
        return envv.store[name]
      else:
        return Obj(objType:ObjType.OTUndefined)


proc newUndefined*(): Obj = 
  return Obj(env: nil, objType: OTUndefined)


proc parseNumber*(str: string): float =
    var res: float
    discard parseFloat(str, res, 0)
    return res
var
  OBJ_TRUE*: Obj  = Obj(env: nil, objType: ObjType.OTBoolean, boolValue:true)
  OBJ_FALSE*: Obj = Obj(env: nil,  objType: ObjType.OTBoolean, boolValue:false)
  OBJ_NIL*: Obj   =  Obj(env: nil,  objType: ObjType.OTUndefined)  





let JS2NGlobal* = Obj(env:newGlobalEnv(), lets:newGlobalEnv(), objType: ObjType.OTObject)
var JS2Nthis* = JS2NGlobal;
let console = Obj(env: JS2Nthis.newEnv(), env: JS2Nthis.newLets(), objType: ObjType.OTObject)
JS2NGlobal.setVar("console", console)

proc logProc(args: seq[Obj]): Obj = 
    args.forEach(proc (a:Obj): void = echo a)
    return Obj(env: JS2Nthis.newEnv(), objType: ObjType.OTUndefined)

let console_log:Obj = Obj(env:JS2Nthis.newEnv(), objType: ObjType.OTFunction, function: logProc) 
console.setVar("log", console_log)

# var o:Obj = JS2NGlobal.getVar("console")
# var o2:Obj = o.getVar("log")
# var ofunc:ObjectFunction = o2.function
# var res = ofunc(@[Obj(env: JS2Nthis.newEnv(), objType: ObjType.OTString, strValue: "hey there")])

var res = JS2NGlobal.getVar("console").getVar("log").function(@[Obj(env: JS2Nthis.newEnv(), objType: ObjType.OTString, strValue: "hey there")])