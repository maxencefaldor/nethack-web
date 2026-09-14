/*
 * Dumps the engine's monster, object, artifact and symbol tables as JSON.
 *
 * Compiled against the engine's own headers and linked with the objects the
 * engine builds for its makedefs tool, so every number comes from the exact
 * engine revision the client ships. No parsing of C source is involved.
 */
#include "hack.h"
#include "artilist.h"

#include <stdio.h>

static void
json_string(FILE *out, const char *text)
{
    if (text == NULL) {
        fputs("null", out);
        return;
    }
    fputc('"', out);
    for (; *text; text++) {
        unsigned char c = (unsigned char) *text;
        switch (c) {
        case '"': fputs("\\\"", out); break;
        case '\\': fputs("\\\\", out); break;
        case '\n': fputs("\\n", out); break;
        case '\t': fputs("\\t", out); break;
        default:
            if (c < 0x20) fprintf(out, "\\u%04x", c);
            else fputc(c, out);
        }
    }
    fputc('"', out);
}

static void
json_char(FILE *out, unsigned char c)
{
    char text[2] = { (char) c, 0 };
    json_string(out, text);
}

static void
attack(FILE *out, const struct attack *a)
{
    fprintf(out, "{\"type\":%d,\"damage\":%d,\"dice\":%d,\"sides\":%d}",
            a->aatyp, a->adtyp, a->damn, a->damd);
}

static void
monsters(FILE *out)
{
    int i, j;
    fputs("[\n", out);
    for (i = LOW_PM; i < NUMMONS; i++) {
        const struct permonst *m = &mons[i];
        fprintf(out, "%s{\"index\":%d,\"names\":[", i == LOW_PM ? "" : ",\n", i);
        for (j = 0; j < NUM_MGENDERS; j++) {
            fputs(j ? "," : "", out);
            json_string(out, m->pmnames[j]);
        }
        fputs("],\"symbol\":", out);
        json_char(out, def_monsyms[(int) m->mlet].sym);
        fprintf(out, ",\"classIndex\":%d,\"level\":%d,\"speed\":%d,\"armorClass\":%d,"
                "\"magicResistance\":%d,\"alignment\":%d,\"generation\":%u,\"attacks\":[",
                (int) m->mlet, m->mlevel, m->mmove, m->ac, m->mr,
                m->maligntyp, (unsigned) m->geno);
        for (j = 0; j < NATTK; j++) {
            if (m->mattk[j].aatyp == 0 && m->mattk[j].adtyp == 0 && m->mattk[j].damd == 0) break;
            fputs(j ? "," : "", out);
            attack(out, &m->mattk[j]);
        }
        fprintf(out, "],\"corpseWeight\":%u,\"nutrition\":%u,\"sound\":%d,\"size\":%d,\"resistances\":%d,"
                "\"conveys\":%d,\"flags1\":%lu,\"flags2\":%lu,\"flags3\":%u,\"difficulty\":%d,\"color\":%d}",
                m->cwt, (unsigned) m->cnutrit, m->msound, m->msize, m->mresists, m->mconveys,
                m->mflags1, m->mflags2, (unsigned) m->mflags3, m->difficulty, m->mcolor);
    }
    fputs("\n]\n", out);
}

static void
objects_table(FILE *out)
{
    int i;
    fputs("[\n", out);
    for (i = 0; i < NUM_OBJECTS; i++) {
        const struct objclass *o = &objects[i];
        fprintf(out, "%s{\"index\":%d,\"name\":", i == 0 ? "" : ",\n", i);
        json_string(out, obj_descr[i].oc_name);
        fputs(",\"description\":", out);
        json_string(out, obj_descr[i].oc_descr);
        fprintf(out, ",\"classIndex\":%d,\"classSymbol\":", (int) o->oc_class);
        json_char(out, def_oc_syms[(int) o->oc_class].sym);
        fputs(",\"className\":", out);
        json_string(out, def_oc_syms[(int) o->oc_class].name);
        fprintf(out, ",\"probability\":%d,\"weight\":%u,\"cost\":%d,\"delay\":%d,\"color\":%d,"
                "\"material\":%d,\"subtype\":%d,\"property\":%d,\"direction\":%d,"
                "\"smallDamage\":%d,\"largeDamage\":%d,\"bonus1\":%d,\"bonus2\":%d,\"nutrition\":%u,"
                "\"magic\":%s,\"charged\":%s,\"unique\":%s,\"nowish\":%s,\"merge\":%s,\"big\":%s,\"tough\":%s}",
                o->oc_prob, o->oc_weight, o->oc_cost, o->oc_delay, o->oc_color, o->oc_material,
                o->oc_subtyp, o->oc_oprop, o->oc_dir, o->oc_wsdam, o->oc_wldam, o->oc_oc1, o->oc_oc2,
                (unsigned) o->oc_nutrition, o->oc_magic ? "true" : "false",
                o->oc_charged ? "true" : "false", o->oc_unique ? "true" : "false",
                o->oc_nowish ? "true" : "false", o->oc_merge ? "true" : "false",
                o->oc_big ? "true" : "false", o->oc_tough ? "true" : "false");
    }
    fputs("\n]\n", out);
}

static void
artifacts(FILE *out)
{
    int i;
    fputs("[\n", out);
    for (i = 1; artilist[i].otyp != 0; i++) {
        const struct artifact *a = &artilist[i];
        fprintf(out, "%s{\"index\":%d,\"name\":", i == 1 ? "" : ",\n", i);
        json_string(out, a->name);
        fprintf(out, ",\"objectIndex\":%d,\"specialFlags\":%lu,\"carriedFlags\":%lu,\"monsterType\":%lu,"
                "\"attack\":", a->otyp, a->spfx, a->cspfx, a->mtype);
        attack(out, &a->attk);
        fputs(",\"defense\":", out);
        attack(out, &a->defn);
        fputs(",\"carry\":", out);
        attack(out, &a->cary);
        fprintf(out, ",\"invokeProperty\":%d,\"alignment\":%d,\"role\":%d,\"race\":%d,\"cost\":%ld,\"color\":%d}",
                a->inv_prop, a->alignment, a->role, a->race, a->cost, a->acolor);
    }
    fputs("\n]\n", out);
}

static void
symbols(FILE *out)
{
    int i;
    fputs("{\"terrain\":[\n", out);
    for (i = 0; i <= MAXPCHARS; i++) {
        fprintf(out, "%s{\"index\":%d,\"symbol\":", i ? ",\n" : "", i);
        json_char(out, defsyms[i].sym);
        fputs(",\"description\":", out);
        json_string(out, defsyms[i].explanation);
        fprintf(out, ",\"color\":%d}", defsyms[i].color);
    }
    fputs("\n],\"monsterClasses\":[\n", out);
    for (i = 0; i < MAXMCLASSES; i++) {
        fprintf(out, "%s{\"index\":%d,\"symbol\":", i ? ",\n" : "", i);
        json_char(out, def_monsyms[i].sym);
        fputs(",\"name\":", out);
        json_string(out, def_monsyms[i].name);
        fputs(",\"description\":", out);
        json_string(out, def_monsyms[i].explain);
        fputs("}", out);
    }
    fputs("\n],\"objectClasses\":[\n", out);
    for (i = 0; i < MAXOCLASSES; i++) {
        fprintf(out, "%s{\"index\":%d,\"symbol\":", i ? ",\n" : "", i);
        json_char(out, def_oc_syms[i].sym);
        fputs(",\"name\":", out);
        json_string(out, def_oc_syms[i].name);
        fputs(",\"description\":", out);
        json_string(out, def_oc_syms[i].explain);
        fputs("}", out);
    }
    fputs("\n],\"warnings\":[\n", out);
    for (i = 0; i < WARNCOUNT; i++) {
        fprintf(out, "%s{\"index\":%d,\"symbol\":", i ? ",\n" : "", i);
        json_char(out, def_warnsyms[i].sym);
        fputs(",\"description\":", out);
        json_string(out, def_warnsyms[i].explanation);
        fprintf(out, ",\"color\":%d}", def_warnsyms[i].color);
    }
    fputs("\n]}\n", out);
}

#define N(name) fprintf(out, "  \"%s\": %ld,\n", #name, (long) (name))

static void
glyph_layout(FILE *out)
{
    fputs("{\n", out);
    N(NUMMONS); N(NUM_OBJECTS); N(MAXPCHARS); N(MAXEXPCHARS); N(NUM_ZAP); N(WARNCOUNT);
    N(GLYPH_MON_OFF); N(GLYPH_MON_MALE_OFF); N(GLYPH_MON_FEM_OFF);
    N(GLYPH_PET_OFF); N(GLYPH_PET_MALE_OFF); N(GLYPH_PET_FEM_OFF);
    N(GLYPH_INVIS_OFF); N(GLYPH_DETECT_OFF); N(GLYPH_DETECT_MALE_OFF); N(GLYPH_DETECT_FEM_OFF);
    N(GLYPH_BODY_OFF); N(GLYPH_RIDDEN_OFF); N(GLYPH_RIDDEN_MALE_OFF); N(GLYPH_RIDDEN_FEM_OFF);
    N(GLYPH_OBJ_OFF); N(GLYPH_CMAP_OFF); N(GLYPH_CMAP_STONE_OFF); N(GLYPH_CMAP_MAIN_OFF);
    N(GLYPH_CMAP_MINES_OFF); N(GLYPH_CMAP_GEH_OFF); N(GLYPH_CMAP_KNOX_OFF); N(GLYPH_CMAP_SOKO_OFF);
    N(GLYPH_CMAP_A_OFF); N(GLYPH_ALTAR_OFF); N(GLYPH_CMAP_B_OFF); N(GLYPH_ZAP_OFF); N(GLYPH_CMAP_C_OFF);
    N(GLYPH_SWALLOW_OFF); N(GLYPH_EXPLODE_OFF); N(GLYPH_WARNING_OFF); N(GLYPH_STATUE_OFF);
    N(GLYPH_STATUE_MALE_OFF); N(GLYPH_STATUE_FEM_OFF); N(GLYPH_PILETOP_OFF); N(GLYPH_OBJ_PILETOP_OFF);
    N(GLYPH_BODY_PILETOP_OFF); N(GLYPH_STATUE_MALE_PILETOP_OFF); N(GLYPH_STATUE_FEM_PILETOP_OFF);
    N(GLYPH_UNEXPLORED_OFF); N(GLYPH_NOTHING_OFF); N(MAX_GLYPH);
    N(S_stone); N(S_vwall); N(S_trwall); N(S_ndoor); N(S_brdnladder); N(S_altar); N(S_grave);
    N(S_arrow_trap); N(MAXTCHARS); N(S_digbeam); N(S_goodpos); N(S_room); N(S_darkroom); N(S_corr);
    N(S_vbeam); N(S_expl_tl); N(S_sw_tl); N(S_upstair); N(S_dnstair); N(S_pool); N(S_lava); N(S_ice);
    fprintf(out, "  \"S_litcorr\": %ld\n}\n", (long) S_litcorr);
}

#define V(scope, name) fprintf(out, "%s  {\"scope\":\"%s\",\"name\":\"%s\",\"value\":%ld}", first ? "" : ",\n", scope, #name, (long) (name)); first = 0

static void
vocabulary(FILE *out)
{
    int first = 1;
    fputs("[\n", out);
    V("attack", AT_NONE); V("attack", AT_CLAW); V("attack", AT_BITE); V("attack", AT_KICK); V("attack", AT_BUTT);
    V("attack", AT_TUCH); V("attack", AT_STNG); V("attack", AT_HUGS); V("attack", AT_SPIT); V("attack", AT_ENGL);
    V("attack", AT_BREA); V("attack", AT_EXPL); V("attack", AT_BOOM); V("attack", AT_GAZE); V("attack", AT_TENT);
    V("attack", AT_WEAP); V("attack", AT_MAGC);
    V("damage", AD_PHYS); V("damage", AD_MAGM); V("damage", AD_FIRE); V("damage", AD_COLD); V("damage", AD_SLEE);
    V("damage", AD_DISN); V("damage", AD_ELEC); V("damage", AD_DRST); V("damage", AD_ACID); V("damage", AD_SPC1);
    V("damage", AD_SPC2); V("damage", AD_BLND); V("damage", AD_STUN); V("damage", AD_SLOW); V("damage", AD_PLYS);
    V("damage", AD_DRLI); V("damage", AD_DREN); V("damage", AD_LEGS); V("damage", AD_STON); V("damage", AD_STCK);
    V("damage", AD_SGLD); V("damage", AD_SITM); V("damage", AD_SEDU); V("damage", AD_TLPT); V("damage", AD_RUST);
    V("damage", AD_CONF); V("damage", AD_DGST); V("damage", AD_HEAL); V("damage", AD_WRAP); V("damage", AD_WERE);
    V("damage", AD_DRDX); V("damage", AD_DRCO); V("damage", AD_DRIN); V("damage", AD_DISE); V("damage", AD_DCAY);
    V("damage", AD_SSEX); V("damage", AD_HALU); V("damage", AD_DETH); V("damage", AD_PEST); V("damage", AD_FAMN);
    V("damage", AD_SLIM); V("damage", AD_ENCH); V("damage", AD_CORR); V("damage", AD_POLY); V("damage", AD_CLRC);
    V("damage", AD_SPEL); V("damage", AD_RBRE); V("damage", AD_SAMU); V("damage", AD_CURS);
    V("material", LIQUID); V("material", WAX); V("material", VEGGY); V("material", FLESH); V("material", PAPER);
    V("material", CLOTH); V("material", LEATHER); V("material", WOOD); V("material", BONE); V("material", DRAGON_HIDE);
    V("material", IRON); V("material", METAL); V("material", COPPER); V("material", SILVER); V("material", GOLD);
    V("material", PLATINUM); V("material", MITHRIL); V("material", PLASTIC); V("material", GLASS); V("material", GEMSTONE);
    V("material", MINERAL);
    V("size", MZ_TINY); V("size", MZ_SMALL); V("size", MZ_MEDIUM); V("size", MZ_LARGE); V("size", MZ_HUGE); V("size", MZ_GIGANTIC);
    V("alignment", A_CHAOTIC); V("alignment", A_NEUTRAL); V("alignment", A_LAWFUL); V("alignment", A_NONE);
    V("resistance", MR_FIRE); V("resistance", MR_COLD); V("resistance", MR_SLEEP); V("resistance", MR_DISINT);
    V("resistance", MR_ELEC); V("resistance", MR_POISON); V("resistance", MR_ACID); V("resistance", MR_STONE);
    V("generation", G_UNIQ); V("generation", G_NOHELL); V("generation", G_HELL); V("generation", G_NOGEN);
    V("generation", G_SGROUP); V("generation", G_LGROUP); V("generation", G_GENO); V("generation", G_NOCORPSE);
    V("generation", G_FREQ);
    fputs("\n]\n", out);
}

int
main(int argc, char **argv)
{
    const char *dir = argc > 1 ? argv[1] : ".";
    char path[1024];
    struct { const char *name; void (*write)(FILE *); } outputs[] = {
        { "monsters.json", monsters }, { "objects.json", objects_table },
        { "artifacts.json", artifacts }, { "symbols.json", symbols },
        { "glyph-layout.json", glyph_layout }, { "vocabulary.json", vocabulary },
    };
    size_t i;
    /* The engine fills these tables at startup rather than statically. */
    monst_globals_init();
    objects_globals_init();
    for (i = 0; i < sizeof outputs / sizeof outputs[0]; i++) {
        FILE *out;
        snprintf(path, sizeof path, "%s/%s", dir, outputs[i].name);
        out = fopen(path, "w");
        if (out == NULL) {
            perror(path);
            return 1;
        }
        outputs[i].write(out);
        fclose(out);
        printf("wrote %s\n", path);
    }
    return 0;
}
