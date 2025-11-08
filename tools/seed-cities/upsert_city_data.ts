import fs from "node:fs";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

import * as cc from "@ideditor/country-coder";

// Helper functions to extract region/subregion/continent codes
function region(iso2: string) {
  const feature = cc.feature(iso2);
  if (!feature) return null;
  // Find M.49 region code (3 digits, 100-900 range)
  const regionCode = feature.properties.groups?.find((g: string) => /^[1-9]\d{2}$/.test(g));
  return regionCode ? { code: regionCode } : null;
}

function subregion(iso2: string) {
  const feature = cc.feature(iso2);
  if (!feature) return null;
  // Subregion codes are typically 3 digits in the 0XX range
  const subregionCode = feature.properties.groups?.find((g: string) => /^0\d{2}$/.test(g));
  return subregionCode ? { code: subregionCode } : null;
}

function continent(iso2: string) {
  const feature = cc.feature(iso2);
  if (!feature) return null;
  // Continent codes are 2-letter codes like 'AS', 'AF', 'NA', 'SA', 'OC', 'AN' (not 'EU' which is European Union)
  const continentCode = feature.properties.groups?.find((g: string) => /^[A-Z]{2}$/.test(g) && g !== 'UN' && g !== 'EU');
  return continentCode ? { code: continentCode } : null;
}

dotenv.config();

const sb = createClient(
  process.env.SUPABASE_URL_DEV!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_DEV!,
  { auth: { persistSession: false } }
);

const toInt = (x: unknown) => {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
};
const normISO2 = (x: string | undefined) =>
  x ? x.trim().toUpperCase() : undefined;

const rows = parse(fs.readFileSync("df_filter.csv"), { columns: true });
async function seedCities(batchSize = 500) {
  console.log(`Seeding ${rows.length} cities ...`);

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    const payload = batch
    .filter((r: any) => {
        const iso2 = r.iso2 || r.iso_alpha2 || r.country_code || r.iso;
        const name = r.city || r.name;
        return (
        iso2 && name && Number.isFinite(+r.lat || +r.latitude) && Number.isFinite(+r.lng || +r.lon || +r.longitude)
        );
    })
    .map((r: any) => {
        const iso2 =
        normISO2(r.iso2 || r.iso_alpha2 || r.country_code || r.iso) || null;
        const lat = +r.lat || +r.latitude || null;
        const lon = +r.lng || +r.lon || +r.longitude || null;

        const reg = iso2 ? region(iso2)?.code : undefined;
        const sub = iso2 ? subregion(iso2)?.code : undefined;
        const cont = iso2 ? continent(iso2)?.code : undefined;

        return {
        name: r.city || r.name,
        admin1: r.admin_name || r.admin1,
        country_iso2: iso2,
        country_name: r.country,
        lat,
        lon,
        m49_region: toInt(reg),
        m49_subregion: toInt(sub),
        continent: cont ?? null,
        population: toInt(r.population),
        };
    });

    const { error } = await sb
      .from("cities")
      .upsert(payload, {
        onConflict: "name,admin1,country_iso2",
        ignoreDuplicates: true,
      });

    if (error) {
      console.error(`❌ Batch ${i / batchSize + 1} failed:`, error.message);
      throw error;
    }

    console.log(
      `✅ Inserted/updated ${
        Math.min(i + batchSize, rows.length)
      } / ${rows.length}`
    );
  }

  console.log("🎉 Done seeding cities.");
}

seedCities().catch((err) => console.error(err));