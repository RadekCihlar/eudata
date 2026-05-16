/**
 * Modulo-11 checksum used by Czech IČO and Slovak IČO.
 * Input: 8-digit string. Returns true if checksum digit valid.
 */
export function validateMod11_8(id: string): boolean {
  if (!/^\d{8}$/.test(id)) return false
  const digits = id.split('').map((d) => Number(d))
  let sum = 0
  for (let i = 0; i < 7; i++) sum += digits[i]! * (8 - i)
  const mod = sum % 11
  let check: number
  if (mod === 0) check = 1
  else if (mod === 1) check = 0
  else check = 11 - mod
  return digits[7] === check
}

/**
 * Polish NIP checksum.
 * Input: 10-digit string. Returns true if checksum digit valid.
 */
export function validateNipChecksum(nip: string): boolean {
  if (!/^\d{10}$/.test(nip)) return false
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7]
  const digits = nip.split('').map((d) => Number(d))
  let sum = 0
  for (let i = 0; i < 9; i++) sum += digits[i]! * weights[i]!
  const mod = sum % 11
  if (mod === 10) return false
  return digits[9] === mod
}

/**
 * Polish REGON checksum (9 or 14 digit variants).
 */
export function validateRegonChecksum(regon: string): boolean {
  if (regon.length === 9) {
    const weights = [8, 9, 2, 3, 4, 5, 6, 7]
    const digits = regon.split('').map((d) => Number(d))
    if (digits.some((d) => Number.isNaN(d))) return false
    let sum = 0
    for (let i = 0; i < 8; i++) sum += digits[i]! * weights[i]!
    const check = sum % 11 === 10 ? 0 : sum % 11
    return digits[8] === check
  }
  if (regon.length === 14) {
    const weights = [2, 4, 8, 5, 0, 9, 7, 3, 6, 1, 2, 4, 8]
    const digits = regon.split('').map((d) => Number(d))
    if (digits.some((d) => Number.isNaN(d))) return false
    let sum = 0
    for (let i = 0; i < 13; i++) sum += digits[i]! * weights[i]!
    const check = sum % 11 === 10 ? 0 : sum % 11
    return digits[13] === check
  }
  return false
}
