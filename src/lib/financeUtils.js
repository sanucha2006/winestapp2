export function getCommissionFinancials(taskOrDraft) {
  const gross = Number(taskOrDraft.revenue ?? taskOrDraft.totalRevenue ?? taskOrDraft.total_revenue ?? 0) || 0
  const partners = taskOrDraft.partners ?? []
  const companyShare = gross * 0.1
  const teamPool = gross * 0.9
  const partnersTotal = partners.reduce((sum, partner) => sum + (Number(partner.amount) || 0), 0)
  const ownerShare = Math.max(0, teamPool - partnersTotal)

  return { gross, companyShare, teamPool, ownerShare, partnersTotal }
}

export function getStreamFinancials(stream) {
  const gross = Number(stream.revenue) || 0
  return {
    gross,
    companyShare: gross * 0.6,
    talentShare: gross * 0.4,
  }
}
