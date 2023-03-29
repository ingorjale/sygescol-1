import { NextRequest, NextResponse } from "next/server";
import School from "../../../../utils/School";
import CierrePeriodo from "../Students/CierrePeriodo";
import VerificarFechas from "../VerificarFechas/CheckDate";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let coleGruposio: any = searchParams.get("Grupos");

  try {
    const colegios = School();
    let DataResponse: any = [];

    let Grupos: any = [];

    if (colegios?.length > 0) {
      let key = 0;
      for (const colegio of colegios) {
        let DateCierrePeriodo: any = await VerificarFechas(key);
        Grupos = [...Grupos, DateCierrePeriodo?.GruposCerrar];

        if (DateCierrePeriodo?.GruposCerrar?.length) {
          let DateCierreConfig: any = await CierrePeriodo(
            colegio,
            DateCierrePeriodo?.GruposCerrar
          );

          // console.log(DateCierreConfig);

          if (DateCierreConfig?.grupos.length > 0) {
            DataResponse = [...DataResponse, DateCierreConfig];
          }
        }
        key++;
        console.log("hay señor");
      }
      return NextResponse.json(
        {
          body: {
            DataResponse,
            // Grupos,
            Msn: "Cierre de periodo realizado",
          },

          // ,
        },
        {
          status: 200,
        }
      );
    }
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { body: "Error al consultar la información" },
      { status: 404 }
    );
  }
}
