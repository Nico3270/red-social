import { Accordion, AccordionSummary, AccordionDetails, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { companyInfo } from "@/config/config";
import TermsAndConditions from "@/legal/componentes/TermsAndConditions";
import PrivacyPolicy from "@/legal/componentes/PrivacyPolicy";
import ShippingPolicy from "@/legal/componentes/ShippingPolicy";


export default function LegalPage() {
  return (
    <main className="max-w-4xl mx-auto py-12 px-6 space-y-8">
      <h2 className="text-center font-bold mb-8">
        Términos y Políticas de {companyInfo.nombre}
      </h2>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Términos y Condiciones</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TermsAndConditions />
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Política de Privacidad</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <PrivacyPolicy />
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Política de Envíos</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <ShippingPolicy />
        </AccordionDetails>
      </Accordion>
    </main>
  );
}
