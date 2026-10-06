from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, model_validator

from .regulasi import normal_segmen


class MasukanIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pokok: float = Field(ge=0, le=1_000_000_000_000)
    tenor: int = Field(ge=0, le=3650)
    bunga_harian_persen: float = Field(ge=0, le=100)
    admin_persen: float = Field(ge=0, lt=100)
    penghasilan: float | None = Field(default=None, ge=0, le=1_000_000_000_000)
    cicilan_lain: float = Field(default=0, ge=0, le=1_000_000_000_000)
    # Id lama (konsumtif_mikro, konsumtif_kecil) dari perangkat yang belum diperbarui diterima sebagai konsumtif.
    segmen: Annotated[Literal["konsumtif", "produktif"], BeforeValidator(normal_segmen)] = "konsumtif"


# Kamus event analitik PRD v4 16.2: daftar lengkap yang diizinkan, dengan properti kategori
# yang diizinkan per event. Tanpa nilai uang, nama, atau teks bebas.
PROPERTI_EVENT: dict[str, dict[str, set[str] | None]] = {
    "app_open": {"mode": {"tamu", "akun"}},
    "onboarding_mode_selected": {"mode": {"tamu", "akun"}},
    "profile_saved": {"has_income": {"ya", "tidak"}},
    "offer_calculated": {"input_method": {"manual", "tempel"}, "segmen": {"konsumtif", "produktif"}},
    "telusur_opened": {"besaran": {"diterima", "total", "biaya", "cicilan", "rasio", "efektif"}},
    "kontrastif_viewed": {},
    "kontrafaktual_viewed": {"variabel": {"pokok", "cicilan_lain", "penghasilan", "ruang"}},
    "clause_viewed": {"jumlah": {str(i) for i in range(0, 9)}},
    "compare_used": {"jumlah": {"1", "2", "3"}},
    "uji_paham_completed": {"tepat": {"0", "1", "2", "3"}},
    "decision_made": {"pilihan": {"ambil", "tidak_jadi", "ubah"}},
    "loan_added": {"sumber": {"putuskan", "manual"}},
    "payment_marked": {"jenis": {"penuh", "sebagian", "dinegosiasikan"}, "terlambat": {"ya", "tidak"}},
    "reminder_enabled": {"aturan": None},
    "notif_opened": {"pemicu": {"H-3", "H-1", "Hari H", "H+1", "H+3", "Gajian"}},
    "help_hub_opened": {"sumber": {"beranda", "saya", "notifikasi", "obrolan", "lain"}},
    "help_contact_tapped": {"jenis": {"ojk", "healing119", "darurat", "pesan"}},
    "export_data": {},
    "delete_account": {},
}
_ATURAN_OK = {"H-3", "H-1", "Hari", "H", "H+1", "H+3", "tidak_ada"}


class PeristiwaIn(BaseModel):
    """Hanya nama event dan properti kategori yang diizinkan. Field lain ditolak."""

    model_config = ConfigDict(extra="forbid")

    nama: str = Field(min_length=3, max_length=40)
    props: dict[str, str] = Field(default_factory=dict, max_length=4)
    sid: str = Field(min_length=8, max_length=32, pattern=r"^[A-Za-z0-9_-]+$")

    @model_validator(mode="after")
    def _kamus(self):
        izin = PROPERTI_EVENT.get(self.nama)
        if izin is None:
            raise ValueError("event tidak ada di kamus 16.2")
        for k, v in self.props.items():
            if k not in izin:
                raise ValueError(f"properti {k} tidak diizinkan")
            boleh = izin[k]
            if boleh is None:
                if not set(v.split()) <= _ATURAN_OK:
                    raise ValueError(f"nilai {k} tidak diizinkan")
            elif v not in boleh:
                raise ValueError(f"nilai {k} tidak diizinkan")
        return self


class TeksIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    teks: str = Field(min_length=1, max_length=8000)


class JawabanIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    teks: str = Field(min_length=1, max_length=1000)


class KewajibanIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=32)
    nama: str = Field(min_length=1, max_length=40)
    cicilan_per_bulan: float = Field(ge=0, le=100_000_000)
    sisa_bulan: int = Field(ge=1, le=120)
    sumber: Literal["manual", "ai"] = "manual"


class PesanIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    peran: Literal["pengguna", "asisten"]
    teks: str = Field(min_length=1, max_length=2000)


class WawancaraIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pesan: list[PesanIn] = Field(min_length=1, max_length=40)
    kewajiban: list[KewajibanIn] = Field(default_factory=list, max_length=20)
    penghasilan: float | None = Field(default=None, ge=0, le=1_000_000_000_000)
    cicilan_penawaran: float = Field(default=0, ge=0, le=1_000_000_000_000)
