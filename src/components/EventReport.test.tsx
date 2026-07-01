import { describe, it, expect } from "vitest";
import { filterTeamMembers, getTeamRegistrationLabel, type TeamReportFilter } from "@/lib/eventReport";

describe("event report team helpers", () => {
  const team = [
    {
      id: "1",
      profiles: {
        nome: "Dr. João",
        especialidade: "Médico",
        registro_profissional: "CRM 12345",
      },
      crm: "CRM 12345",
      coren: null,
    },
    {
      id: "2",
      profiles: {
        nome: "Enf. Maria",
        especialidade: "Enfermeiro",
        registro_profissional: "COREN 98765",
      },
      crm: null,
      coren: "COREN 98765",
    },
    {
      id: "3",
      profiles: {
        nome: "Téc. Pedro",
        especialidade: "Técnico",
        registro_profissional: "",
      },
      crm: null,
      coren: null,
    },
  ] as any;

  it("filters team members by registration availability", () => {
    expect(filterTeamMembers(team, "with_registration")).toHaveLength(2);
    expect(filterTeamMembers(team, "medical")).toHaveLength(1);
    expect(filterTeamMembers(team, "nursing")).toHaveLength(1);
  });

  it("formats CRM and COREN values for the report", () => {
    expect(getTeamRegistrationLabel(team[0] as any)).toBe("CRM 12345");
    expect(getTeamRegistrationLabel(team[1] as any)).toBe("COREN 98765");
    expect(getTeamRegistrationLabel(team[2] as any)).toBe("—");
  });
});
