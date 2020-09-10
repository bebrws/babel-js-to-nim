import sequtils

proc forEach*[T](s: openArray[T], op: proc (x: T): void {.closure.}): void =
  for i in 0 ..< s.len:
    op(s[i])