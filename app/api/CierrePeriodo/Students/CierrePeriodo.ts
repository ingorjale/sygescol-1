import { conecctions } from "../../../../utils/Conexions";
import CheckConfig from "../Params/CheckConfig";

export default async function CierrePeriodo(colegio: any, grupos: any) {
  try {
    let gruposFind = "";
    grupos?.find((grup: any) => {
      gruposFind = `${gruposFind}${grup.GrupoId},`;
    });

    let Pendientes: any = [];

    gruposFind = gruposFind.substring(0, gruposFind.length - 1);

    const { periodo } = grupos.find((grup: any) => grup.periodo);
    console.log(periodo);

    const conexion = conecctions[colegio.value];

    const ListDcneQueri: any = conexion.query(
      `SELECT cga.i as CgaId,dcne.i as DocenteId,dcne.dcne_num_docu as Documento, CONCAT (dcne.dcne_nom1," ",dcne.dcne_nom2) as Nombre, CONCAT (dcne.dcne_ape1," ",dcne.dcne_ape2) as Apellidos,v_grupos.grupo_id as GrupoId,v_grupos.gao_nombre, v_grupos.grupo_sede,v_grupos.jornada_id, v_grupos.grupo_nombre AS gradoGrupo  FROM cga INNER JOIN dcne ON dcne.i=cga.g INNER JOIN v_grupos ON v_grupos.grupo_id=cga.b WHERE v_grupos.grupo_id in (${gruposFind})`
    );

    const estudiantesQueri: any = conexion.query(
      `SELECT alumno.alumno_id AS alumno, matri_id AS matricula,CONCAT(alumno_nom1,' ',alumno_nom2,' ',alumno_ape1,' ',alumno_ape2) AS nombre, grupo_nombre AS grupo, matricula.grupo_id AS grupoId, matricula.matri_extraordinaria AS extraordinaria FROM alumno INNER JOIN matricula ON matricula.alumno_id = alumno.alumno_id INNER JOIN v_grupos ON matricula.grupo_id = v_grupos.grupo_id WHERE matri_id NOT IN (SELECT matri_id FROM novedad_estudiante) AND matri_estado = 0 AND matricula.grupo_id IN (${gruposFind}) ORDER BY grado_base, jornada_id, grupo_codigo,alumno_nom1,alumno_nom2,alumno_ape1,alumno_ape2 ASC`
    );

    const asignaturasQueri: any = conexion.query(
      "SELECT cga.b as grupoId, cga.i AS cga, aintrs.b AS asignatura, aes.b AS area, efss.b as Enfasis, cga.g AS docente FROM cga INNER JOIN aintrs ON cga.a = aintrs.i INNER JOIN efr ON efr.i = aintrs.g INNER JOIN aes ON efr.a = aes.i INNER JOIN efss ON efr.b = efss.i"
    );
    const notasQueri: any = conexion.query(
      `SELECT acciones_subacciones.id_subaccion AS idRelacion, acciones_subacciones.id_cga AS cga, periodo, id_matri as matricula, valoracion, observacion, rel_notas_nuevo_sistema.fecha_registro AS registroNota, acciones_subacciones.fecha_registro AS registroAccion, acciones_subacciones.id_grupo AS grupo FROM acciones_subacciones INNER JOIN rel_notas_nuevo_sistema ON acciones_subacciones.id_subaccion = rel_notas_nuevo_sistema.id_accion WHERE id_grupo IN (${gruposFind}) and periodo=${periodo}   ORDER BY matricula ASC`
    );

    const accionesQueri: any = conexion.query(
      `SELECT periodo, id_grupo, nombre, descripcion, acciones.id AS idPrincipal, acciones_subacciones.id AS idRelacion, grupo_nombre AS grupo, acciones_subacciones.id_cga AS cga FROM acciones_subacciones INNER JOIN acciones ON acciones.id = acciones_subacciones.id_subaccion INNER JOIN v_grupos ON id_grupo = grupo_id WHERE grupo_id IN(${gruposFind}) and periodo=${periodo}`
    );

    const docentesQueri: any = conexion.query(
      `SELECT dcne.i, CONCAT(dcne_nom1,' ',dcne_nom2,' ',dcne_ape1,' ',dcne_ape2) AS Nombre FROM dcne`
    );
    const direccionGrupoQueri = conexion.query(
      `SELECT u AS docente, i AS gradoGrupo FROM cg`
    );
    const competenciasQueri: any =
      conexion.query(`SELECT DISTINCT proceso_evaluacion.proeva_sub_id, proceso_evaluacion_banco.proeva_id, proceso_evaluacion.cga_id, proceso_evaluacion.grupo_id ,proceso_evaluacion_banco.proeva_cod, proceso_evaluacion_banco.proeva_desc, proceso_evaluacion_banco.proeva_porcen 
          FROM proceso_evaluacion_banco 
          INNER JOIN proceso_evaluacion ON (proceso_evaluacion_banco.proeva_id = proceso_evaluacion.proeva_sub_id)
          ORDER BY proceso_evaluacion_banco.proeva_cod`);

    const [
      ListDcne,
      estudiantes,
      asignaturas,
      notas,
      acciones,
      docentes,
      direccionGrupo,
      competencias,
    ]: [any, any, any, any, any, any, any, any] = await Promise.all([
      ListDcneQueri,
      estudiantesQueri,
      asignaturasQueri,
      notasQueri,
      accionesQueri,
      docentesQueri,
      direccionGrupoQueri,
      competenciasQueri,
    ]);

    const GetConfiguracion: any = await CheckConfig(colegio.value);

    if (GetConfiguracion?.forder == "S") {
      // const [ListDcne]: [any] = await Promise.all([DcneQuery]);

      let DcneFindId = "";
      ListDcne[0]?.find((listDcne: any) => {
        DcneFindId = `${DcneFindId}${listDcne.CgaId},`;
      });

      DcneFindId = DcneFindId.substring(0, DcneFindId.length - 1);

      const [DcneQueryFordeb]: any = await conexion.query(
        `SELECT fordeb.fordeb_id as FordebId,fordeb.cga_id ,fordeb.fordeb_tipo,fordeb_banco.asignatura_id,fordeb_banco.dcne_id, fordeb_banco.fordeb_desc ,fordeb_banco.peri_id, fordeb.esca_nac_id AS escala,fordeb_banco.fordeb_id as IdBanco FROM fordeb LEFT JOIN fordeb_banco ON (fordeb_banco.fordeb_id=fordeb.fordeb_subid) WHERE fordeb.cga_id in (${DcneFindId}) and fordeb_banco.peri_id='${periodo}'`
      );

      const newData = ListDcne[0]?.reduce((acc: any, item: any) => {
        const AsignaturaDcne = asignaturas[0]?.find(
          (asig: any) =>
            item?.DocenteId?.toString()?.includes(asig?.docente?.toString()) &&
            item?.CgaId?.toString()?.includes(asig?.cga?.toString())
        );
        const dcneFordeb = DcneQueryFordeb.filter(
          (dcne: any) => dcne.cga_id == item.CgaId
        );

        let NewNotas = notas[0].map((nota: any) => {
          let newData = acciones[0].find((accion: any) => {
            return (
              accion.idPrincipal == nota.idRelacion &&
              accion.cga == item.CgaId &&
              accion.id_grupo == item.GrupoId
            );
          });

          nota = {
            ...nota,
            ...newData,
          };
          return nota;
        });

        let NewArrayEstudiantes = estudiantes[0]?.map((estu: any) => {
          const NotasEstudiante = NewNotas?.filter((nota: any) => {
            return (
              nota?.matricula
                ?.toString()
                .includes(estu?.matricula.toString()) &&
              nota?.cga.toString().includes(item?.CgaId.toString())
            );
          });

          if (NotasEstudiante?.length == 0) {
            Pendientes.push({
              ...estu,

              mensaje: `El estudiante ${
                estu?.nombre
              } no tiene notas registradas en la asignatura ${
                AsignaturaDcne?.asignatura || ""
              }  en el grupo ${item?.gradoGrupo || ""} `,
            });
          }
          estu = {
            ...estu,
            Notas: NotasEstudiante || [],
          };
          return estu;
        });

        const EstudianteGrupo = NewArrayEstudiantes.filter((estu: any) => {
          return estu?.grupoId == item?.GrupoId;
        });

        const key = `${item.DocenteId}`;

        if (!acc[key]) {
          acc[key] = {
            ...item,
            Fordeb: {
              Fortalezas: [],
              Debilidades: [],
              Recomentaciones: [],
            },
            Estudiantes: EstudianteGrupo,
            Asignaturas: AsignaturaDcne,
          };
        }

        if (dcneFordeb?.length > 0) {
          dcneFordeb.forEach((fordeb: any) => {
            if (fordeb.fordeb_tipo == "F") {
              acc[key].Fordeb?.Fortalezas.push({
                ...fordeb,
              });
            }
            if (fordeb.fordeb_tipo == "D") {
              acc[key].Fordeb?.Debilidades.push({
                ...fordeb,
              });
            }
            if (fordeb?.fordeb_tipo == "R") {
              acc[key].Fordeb.Recomentaciones.push({
                ...fordeb,
              });
            }
          });
        }

        if (acc[key].Fordeb?.Fortalezas.length == 0) {
          Pendientes.push({
            ...item,
            mensaje: `el docente ${item?.Nombre} ${item?.Apellidos} no registra fortalezas en la asignatura ${AsignaturaDcne?.asignatura} en el grupo ${item?.gradoGrupo}`,
          });
        }

        if (acc[key].Fordeb?.Debilidades.length == 0) {
          Pendientes.push({
            ...item,
            mensaje: `el docente ${item?.Nombre} ${item?.Apellidos} no registra debilidades en la asignatura ${AsignaturaDcne?.asignatura} en el grupo ${item?.gradoGrupo}`,
          });
        }
        if (acc[key].Fordeb?.Recomentaciones.length == 0) {
          Pendientes.push({
            ...item,
            mensaje: `el docente ${item?.Nombre} ${item?.Apellidos} no registra recomendaciones en la asignatura ${AsignaturaDcne?.asignatura} en el grupo ${item?.gradoGrupo}`,
          });
        }

        if (
          acc[key].Fordeb?.Recomentaciones?.length > 0 &&
          acc[key].Fordeb?.Debilidades?.length > 0 &&
          !(
            acc[key].Fordeb?.Recomentaciones.length ==
            acc[key].Fordeb?.Debilidades.length
          )
        ) {
          Pendientes.push({
            ...item,
            mensaje: `el docente ${item?.Nombre} ${item?.Apellidos} no registra la misma cantidad de recomendaciones y debilidades en la asignatura ${AsignaturaDcne?.asignatura} en el grupo ${item?.gradoGrupo}`,
            lengthRecomendaciones: acc[key].Fordeb?.Recomentaciones.length,
            lengthDebilidades: acc[key].Fordeb?.Debilidades.length,
          });
        }

        return acc;
      }, {});

      console.log(Pendientes);

      if (Object.values(newData).length) {
        return {
          Docentes: Object.values(newData),
          // Pendientes,
        };
      }
    }
  } catch (error) {
    console.log("Este es el error->", error);
    return { body: "Error al consultar los estudiantes" };
  }
}
