import { fetchJSON } from 'eudata-common'
import type {
  BuildingInfo,
  Lien,
  OwnershipInfo,
  ParcelInfo,
  PropertySummary,
  RequestOptions,
} from './types.js'

const VDP_BASE = 'https://vdp.cuzk.cz/vdp/ruian/rest'

interface ParcelRaw {
  kodKU?: string
  nazevKU?: string
  parcelniCislo?: string
  vymera?: number
  zpusobVyuziti?: string
  vlastnik?: string
  typVlastnika?: string
}

function mapOwnerType(t: string | undefined): ParcelInfo['ownerType'] {
  switch ((t ?? '').toLowerCase()) {
    case 'osoba':
    case 'person':
      return 'person'
    case 'firma':
    case 'pravnicka':
    case 'company':
      return 'company'
    case 'stat':
    case 'state':
      return 'state'
    case 'obec':
    case 'municipality':
      return 'municipality'
    default:
      return 'unknown'
  }
}

export const cadastre = {
  async parcel(
    cadastralArea: string,
    parcelNumber: string,
    opts?: RequestOptions
  ): Promise<ParcelInfo> {
    const url = `${VDP_BASE}/parcely?ku=${encodeURIComponent(cadastralArea)}&cislo=${encodeURIComponent(parcelNumber)}`
    const raw = await fetchJSON<ParcelRaw>(url, { ...(opts ?? {}), source: 'cz:cuzk' })
    return {
      cadastralArea: raw.nazevKU ?? cadastralArea,
      parcelNumber: raw.parcelniCislo ?? parcelNumber,
      area: raw.vymera ?? 0,
      landType: raw.zpusobVyuziti ?? '',
      owner: raw.vlastnik ?? '',
      ownerType: mapOwnerType(raw.typVlastnika),
      liens: [],
    }
  },

  async building(address: string, opts?: RequestOptions): Promise<BuildingInfo> {
    const url = `${VDP_BASE}/stavby?adresa=${encodeURIComponent(address)}`
    interface BuildingRaw {
      adresa?: string
      typStavby?: string
      rokVystavby?: number
      podlazi?: number
      jednotek?: number
      parcelniCislo?: string
      vlastnik?: string
    }
    const raw = await fetchJSON<BuildingRaw>(url, { ...(opts ?? {}), source: 'cz:cuzk' })
    return {
      address: raw.adresa ?? address,
      buildingType: raw.typStavby ?? '',
      builtYear: raw.rokVystavby ?? null,
      floors: raw.podlazi ?? null,
      units: raw.jednotek ?? null,
      parcelNumber: raw.parcelniCislo ?? '',
      owner: raw.vlastnik ?? '',
    }
  },

  async ownership(propertyId: string, opts?: RequestOptions): Promise<OwnershipInfo> {
    const url = `${VDP_BASE}/vlastnictvi/${encodeURIComponent(propertyId)}`
    interface OwnerRaw {
      jmeno?: string
      podil?: string
      typ?: string
      ico?: string
    }
    interface TransferRaw {
      datum?: string
      odKoho?: string
      komu?: string
      typ?: string
    }
    interface OwnershipRaw {
      vlastnici?: OwnerRaw[]
      historiePrevodu?: TransferRaw[]
    }
    const raw = await fetchJSON<OwnershipRaw>(url, { ...(opts ?? {}), source: 'cz:cuzk' })
    return {
      propertyId,
      owners: (raw.vlastnici ?? []).map((o) => {
        const owner: { name: string; share: string; type: 'person' | 'company'; ico?: string } = {
          name: o.jmeno ?? '',
          share: o.podil ?? '',
          type: o.typ === 'firma' ? 'company' : 'person',
        }
        if (o.ico) owner.ico = o.ico
        return owner
      }),
      transferHistory: (raw.historiePrevodu ?? []).map((t) => ({
        date: t.datum ?? '',
        from: t.odKoho ?? '',
        to: t.komu ?? '',
        type: t.typ ?? '',
      })),
    }
  },

  async searchByOwner(query: string, opts?: RequestOptions): Promise<PropertySummary[]> {
    const url = `${VDP_BASE}/vlastnictvi/vyhledat?q=${encodeURIComponent(query)}`
    interface Row {
      id?: string
      ku?: string
      parcelniCislo?: string
      typ?: string
    }
    const res = await fetchJSON<{ vysledky?: Row[] }>(url, { ...(opts ?? {}), source: 'cz:cuzk' })
    return (res.vysledky ?? []).map((r) => ({
      propertyId: r.id ?? '',
      cadastralArea: r.ku ?? '',
      parcelNumber: r.parcelniCislo ?? '',
      type: r.typ ?? '',
    }))
  },

  async liens(propertyId: string, opts?: RequestOptions): Promise<Lien[]> {
    const url = `${VDP_BASE}/zatizeni/${encodeURIComponent(propertyId)}`
    interface LienRaw {
      typ?: string
      drzitel?: string
      datumZapisu?: string
      popis?: string
    }
    const res = await fetchJSON<{ zatizeni?: LienRaw[] }>(url, {
      ...(opts ?? {}),
      source: 'cz:cuzk',
    })
    return (res.zatizeni ?? []).map((z) => ({
      type: z.typ ?? '',
      holder: z.drzitel ?? '',
      registeredDate: z.datumZapisu ?? '',
      description: z.popis ?? '',
    }))
  },
}
