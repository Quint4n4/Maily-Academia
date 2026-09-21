import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, Eye, Image as IconoImagen, Loader2, Plus, RotateCcw, Save, Upload,
} from 'lucide-react';

import Lienzo from '../../components/diploma/Lienzo';
import PanelDePropiedades from '../../components/diploma/PanelDePropiedades';
import { PASO_MM, TIPOS, dentroDePagina, elementoNuevo } from '../../components/diploma/utilidades';
import courseService from '../../services/courseService';
import diplomaService from '../../services/diplomaService';

/**
 * Editor del diploma de un curso.
 *
 * Fuera de `CourseBuilder.jsx` a proposito: ese archivo ya tiene 1899 lineas.
 *
 * Lo que se guarda son milimetros; el lienzo solo los pinta a escala. Y el
 * boton de vista previa NO dibuja el PDF aqui: se lo pide al servidor, porque
 * el navegador mide el texto distinto a ReportLab y un editor que predice el
 * resultado miente justo donde mas duele, cuando el alumno ya lo descargo.
 */
const DiplomaEditor = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [curso, setCurso] = useState(null);
  const [plantilla, setPlantilla] = useState(null);
  const [documento, setDocumento] = useState(null);
  const [recursos, setRecursos] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [errores, setErrores] = useState({ generales: [], porElemento: {} });

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [sinGuardar, setSinGuardar] = useState(false);

  const original = useRef(null);
  const archivoInput = useRef(null);

  const recursosPorId = useMemo(
    () => Object.fromEntries(recursos.map((r) => [r.id, r])),
    [recursos],
  );

  const elementoActual = useMemo(
    () => documento?.elementos.find((e) => e.id === seleccionado) ?? null,
    [documento, seleccionado],
  );

  // --- Carga inicial -------------------------------------------------
  useEffect(() => {
    let vigente = true;

    const cargar = async () => {
      setCargando(true);
      try {
        const [datosCurso, galeria] = await Promise.all([
          courseService.getById(courseId).catch(() => null),
          diplomaService.listarRecursos().catch(() => []),
        ]);
        if (!vigente) return;

        setCurso(datosCurso);
        setRecursos(galeria);

        // El curso puede tener plantilla propia o no tener ninguna. Sin
        // plantilla se crea una a partir de la de la plataforma, para que el
        // maestro nunca empiece con una hoja en blanco.
        let suPlantilla = null;
        if (datosCurso?.plantilla_de_diploma_id) {
          suPlantilla = await diplomaService
            .obtenerPlantilla(datosCurso.plantilla_de_diploma_id)
            .catch(() => null);
        }
        if (!suPlantilla) {
          suPlantilla = await diplomaService.crearPlantilla({
            nombre: `Diploma de ${datosCurso?.title ?? 'mi curso'}`.slice(0, 120),
          });
          await courseService
            .update(courseId, { plantilla_de_diploma_id: suPlantilla.id })
            .catch(() => null);
        }
        if (!vigente) return;

        setPlantilla(suPlantilla);
        setDocumento(suPlantilla.documento);
        original.current = JSON.stringify(suPlantilla.documento);
      } catch {
        if (vigente) setAviso({ tipo: 'error', texto: 'No se pudo abrir el editor.' });
      } finally {
        if (vigente) setCargando(false);
      }
    };

    cargar();
    return () => { vigente = false; };
  }, [courseId]);

  // --- Cambios -------------------------------------------------------
  const cambiarElementos = useCallback((elementos) => {
    setDocumento((actual) => ({ ...actual, elementos }));
    setSinGuardar(true);
  }, []);

  const cambiarElemento = (actualizado) => {
    cambiarElementos(
      documento.elementos.map((e) =>
        (e.id === actualizado.id ? dentroDePagina(actualizado) : e)),
    );
  };

  // Ajuste fino con el teclado: arrastrando es imposible acertar el ultimo
  // milimetro, y escribir el numero a mano obliga a soltar el raton e ir al
  // panel. Shift baja el paso para cuando el milimetro entero se pasa.
  useEffect(() => {
    if (!seleccionado || !documento) return undefined;

    const alPulsar = (evento) => {
      const pasos = {
        ArrowLeft: [-1, 0], ArrowRight: [1, 0],
        ArrowUp: [0, -1], ArrowDown: [0, 1],
      };
      const paso = pasos[evento.key];
      if (!paso) return;

      // Si el foco esta en un campo del panel, las flechas son suyas: mueven
      // el cursor o cambian el numero.
      const activo = document.activeElement?.tagName;
      if (activo === 'INPUT' || activo === 'TEXTAREA' || activo === 'SELECT') return;

      evento.preventDefault();
      const distancia = evento.shiftKey ? 0.2 : PASO_MM;
      setDocumento((actual) => ({
        ...actual,
        elementos: actual.elementos.map((e) => (
          e.id === seleccionado
            ? dentroDePagina({
              ...e,
              x: Number((e.x + paso[0] * distancia).toFixed(2)),
              y: Number((e.y + paso[1] * distancia).toFixed(2)),
            })
            : e
        )),
      }));
      setSinGuardar(true);
    };

    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [seleccionado, documento]);

  const agregar = (tipo) => {
    const nuevo = elementoNuevo(tipo, documento.elementos);
    cambiarElementos([...documento.elementos, nuevo]);
    setSeleccionado(nuevo.id);
  };

  const borrar = () => {
    if (!elementoActual || elementoActual.bloqueado) return;
    cambiarElementos(documento.elementos.filter((e) => e.id !== elementoActual.id));
    setSeleccionado(null);
  };

  const restablecer = () => {
    if (!original.current) return;
    setDocumento(JSON.parse(original.current));
    setErrores({ generales: [], porElemento: {} });
    setSeleccionado(null);
    setSinGuardar(false);
  };

  const ponerDeFondo = (recurso) => {
    setDocumento((actual) => ({
      ...actual,
      fondo: recurso ? { recurso_id: recurso.id } : null,
    }));
    setSinGuardar(true);
  };

  // --- Guardar y previsualizar ---------------------------------------
  const guardar = async () => {
    setGuardando(true);
    setAviso(null);
    try {
      const guardada = await diplomaService.guardarDocumento(plantilla.id, documento);
      setPlantilla(guardada);
      original.current = JSON.stringify(guardada.documento);
      setErrores({ generales: [], porElemento: {} });
      setSinGuardar(false);
      setAviso({ tipo: 'ok', texto: 'Diploma guardado.' });
    } catch (error) {
      const detalle = diplomaService.erroresDeDocumento(error);
      setErrores(detalle);
      const cuantos = Object.keys(detalle.porElemento).length;
      setAviso({
        tipo: 'error',
        texto: cuantos
          ? `Hay ${cuantos} elemento(s) con problemas. Están marcados en rojo.`
          : (detalle.generales[0] ?? 'No se pudo guardar.'),
      });
    } finally {
      setGuardando(false);
    }
  };

  const previsualizar = async () => {
    setAviso(null);
    try {
      const blob = await diplomaService.previsualizar(plantilla.id, documento);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      // Se libera tarde para que la pestaña nueva alcance a cargarlo.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      const detalle = diplomaService.erroresDeDocumento(error);
      setErrores(detalle);
      setAviso({
        tipo: 'error',
        texto: 'El diploma tiene errores, corrígelos antes de ver la vista previa.',
      });
    }
  };

  const subirImagen = async (evento) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    setSubiendo(true);
    setAviso(null);
    try {
      const recurso = await diplomaService.subirRecurso({ archivo, tipo: 'marco' });
      setRecursos((actuales) => [recurso, ...actuales]);
      setAviso({ tipo: 'ok', texto: `"${recurso.nombre}" ya está en tu galería.` });
    } catch (error) {
      const motivo = error?.response?.data?.archivo?.[0] ?? 'No se pudo subir la imagen.';
      setAviso({ tipo: 'error', texto: motivo });
    } finally {
      setSubiendo(false);
      if (archivoInput.current) archivoInput.current.value = '';
    }
  };

  if (cargando) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!documento) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <p className="text-gray-600 dark:text-gray-300">No se pudo abrir el editor de diplomas.</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/instructor/courses/${courseId}/edit`)}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label="Volver al curso"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Diploma del curso
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {curso?.title ?? `Curso ${courseId}`}
              {sinGuardar && (
                <span className="ml-2 text-amber-600 dark:text-amber-400">· sin guardar</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={restablecer}
            disabled={!sinGuardar}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <RotateCcw size={16} /> Deshacer cambios
          </button>
          <button
            type="button"
            onClick={previsualizar}
            className="flex items-center gap-1.5 rounded-lg border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-300 dark:hover:bg-blue-900/30"
          >
            <Eye size={16} /> Ver el PDF real
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Guardar
          </button>
        </div>
      </div>

      {aviso && (
        <div
          className={[
            'mb-4 rounded-lg px-4 py-3 text-sm',
            aviso.tipo === 'ok'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300',
          ].join(' ')}
        >
          {aviso.texto}
          {errores.generales.map((mensaje) => (
            <span key={mensaje} className="mt-1 block">{mensaje}</span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        {/* Paleta y galería */}
        <aside className="space-y-5">
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Añadir al diploma
            </h2>
            <div className="space-y-1.5">
              {Object.entries(TIPOS).map(([tipo, texto]) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => agregar(tipo)}
                  className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <Plus size={14} /> {texto}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Marco de fondo
            </h2>

            <button
              type="button"
              onClick={() => archivoInput.current?.click()}
              disabled={subiendo}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300"
            >
              {subiendo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Subir imagen
            </button>
            <input
              ref={archivoInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={subirImagen}
            />
            <p className="mb-3 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
              PNG, JPG o WEBP, máximo 5 MB. Exporta el diseño de Canva en A4
              horizontal y <strong>sin texto</strong>: las palabras las escribe el sistema.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => ponerDeFondo(null)}
                className={[
                  'flex h-16 items-center justify-center rounded-md border text-[11px]',
                  !documento.fondo
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'border-gray-200 text-gray-500 hover:border-blue-300 dark:border-gray-700 dark:text-gray-400',
                ].join(' ')}
              >
                Sin marco
              </button>
              {recursos.map((recurso) => (
                <button
                  key={recurso.id}
                  type="button"
                  onClick={() => ponerDeFondo(recurso)}
                  title={recurso.nombre}
                  className={[
                    'h-16 overflow-hidden rounded-md border',
                    documento.fondo?.recurso_id === recurso.id
                      ? 'border-blue-500 ring-2 ring-blue-300'
                      : 'border-gray-200 hover:border-blue-300 dark:border-gray-700',
                  ].join(' ')}
                >
                  {recurso.url ? (
                    <img src={recurso.url} alt={recurso.nombre} className="h-full w-full object-cover" />
                  ) : (
                    <IconoImagen size={16} className="mx-auto text-gray-400" />
                  )}
                </button>
              ))}
            </div>
          </section>
        </aside>

        {/* Lienzo */}
        <main>
          <Lienzo
            documento={documento}
            seleccionado={seleccionado}
            onSeleccionar={setSeleccionado}
            onCambiar={cambiarElementos}
            errores={errores.porElemento}
            recursosPorId={recursosPorId}
          />
          <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
            Lo que ves aquí es una aproximación para colocar los elementos.
            Pulsa <strong>Ver el PDF real</strong> para comprobar cómo queda de verdad.
          </p>
        </main>

        {/* Propiedades */}
        <aside className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <PanelDePropiedades
            elemento={elementoActual}
            onCambiar={cambiarElemento}
            onBorrar={borrar}
            errores={errores.porElemento[seleccionado] ?? []}
            recursos={recursos}
          />
        </aside>
      </div>
    </div>
  );
};

export default DiplomaEditor;
