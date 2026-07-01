export type TeamReportFilter = "all" | "with_registration" | "medical" | "nursing";

export interface TeamReportMember {
  id: string;
  crm?: string | null;
  coren?: string | null;
  profiles?: {
    nome: string;
    especialidade: string;
    registro_profissional?: string | null;
    telefone?: string | null;
  } | null;
}

export function getTeamRegistrationLabel(member: TeamReportMember) {
  const registration = member.profiles?.registro_profissional?.trim();
  if (registration) return registration;

  const crm = member.crm?.trim();
  if (crm) return crm;

  const coren = member.coren?.trim();
  if (coren) return coren;

  return "—";
}

export function getTeamRegistrationType(member: TeamReportMember) {
  const specialty = member.profiles?.especialidade?.toLowerCase() || "";
  if (specialty.includes("médico") || specialty.includes("medico") || member.crm) return "CRM";
  if (specialty.includes("enfermeiro") || member.coren) return "COREN";
  return null;
}

export function filterTeamMembers(team: TeamReportMember[], filter: TeamReportFilter) {
  switch (filter) {
    case "with_registration":
      return team.filter((member) => {
        const label = getTeamRegistrationLabel(member);
        return label !== "—";
      });
    case "medical":
      return team.filter((member) => {
        const specialty = member.profiles?.especialidade?.toLowerCase() || "";
        return specialty.includes("médico") || specialty.includes("medico") || member.crm;
      });
    case "nursing":
      return team.filter((member) => {
        const specialty = member.profiles?.especialidade?.toLowerCase() || "";
        return specialty.includes("enfermeiro") || member.coren;
      });
    case "all":
    default:
      return team;
  }
}
