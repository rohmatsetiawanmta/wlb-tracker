// src/pages/admin/ActivityCategoryManager.jsx

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import {
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Edit,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";

// Fungsi untuk membuat ID acak dengan prefix baru
const generateRandomId = (prefix) => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return `${prefix}-${result}`;
};

const ActivityCategoryManager = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [form, setForm] = useState({});

  // State View dan Seleksi (Disesuaikan untuk Domain/Type/Tag)
  const [currentView, setCurrentView] = useState("domains");
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  /**
   * Mengambil data berdasarkan currentView dan item yang dipilih (drill-down).
   */
  const fetchItems = useCallback(async () => {
    setLoading(true);
    let query;

    if (currentView === "domains") {
      query = supabase
        .from("activity_domains") // Tabel Domain
        .select("*")
        .order("sort_order", { ascending: true });
    } else if (currentView === "types" && selectedDomain) {
      query = supabase
        .from("activity_types") // Tabel Tipe Aktivitas
        .select(`*, domain:domain_id(name)`) // Join ke Domain
        .eq("domain_id", selectedDomain.domain_id) // Menggunakan domain_id untuk filter
        .order("sort_order", { ascending: true });
    } else if (currentView === "tags" && selectedType) {
      query = supabase
        .from("activity_tags") // Tabel Tag Aktivitas
        .select(
          `*, type:type_id(name, domain:domain_id(name))` // Join ke Tipe dan Domain
        )
        .eq("type_id", selectedType.type_id) // Menggunakan type_id untuk filter
        .order("sort_order", { ascending: true });
    } else {
      query = supabase.from("activity_domains").select("*"); // Fallback
    }

    const { data, error } = await query;
    if (error) {
      toast.error(`Gagal mengambil data!`);
      console.error(error);
    } else {
      setItems(data);
    }
    setLoading(false);
  }, [currentView, selectedDomain, selectedType]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleOpenModal = (item = null) => {
    setCurrentItem(item);
    let initialForm = item ? { ...item } : { is_published: true };

    // PERBAIKAN: Atur Foreign Key menggunakan ID custom TEXT (domain_id atau type_id), bukan ID internal UUID (id).
    if (currentView === "types" && selectedDomain) {
      initialForm.domain_id = selectedDomain.domain_id;
    } else if (currentView === "tags" && selectedType) {
      initialForm.type_id = selectedType.type_id;
    }

    if (!initialForm.name) initialForm.name = "";

    setForm(initialForm);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentItem(null);
    setForm({});
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let updatedForm = {
      ...form,
      [name]: type === "checkbox" ? checked : value,
    };
    setForm(updatedForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let tableName =
      currentView === "domains"
        ? "activity_domains"
        : currentView === "types"
        ? "activity_types"
        : "activity_tags";
    let result;

    let payload = { ...form };

    // Hapus object join sebelum insert/update
    if (payload.domain) delete payload.domain;
    if (payload.type) delete payload.type;

    if (!payload.name || payload.name.trim() === "") {
      toast.error(`Nama harus diisi!`);
      return;
    }

    // Pengecekan eksplisit untuk Foreign Key yang kosong saat insert
    if (!currentItem) {
      if (currentView === "types" && !payload.domain_id) {
        toast.error(
          `Gagal: Domain Induk harus dipilih (atau Domain belum dibuat).`
        );
        return;
      }
      if (currentView === "tags" && !payload.type_id) {
        toast.error(
          `Gagal: Tipe Aktivitas Induk harus dipilih (atau Tipe belum dibuat).`
        );
        return;
      }
    }

    if (!currentItem) {
      let prefix;
      let idColumn;

      if (currentView === "domains") {
        prefix = "AD";
        idColumn = "domain_id";
      } else if (currentView === "types") {
        prefix = "AT";
        idColumn = "type_id";
      } else if (currentView === "tags") {
        prefix = "AG";
        idColumn = "tag_id";
      } else {
        toast.error("Tampilan tidak valid.");
        return;
      }

      // Isi ID dan Sort Order baru
      payload[idColumn] = generateRandomId(prefix);
      const newSortOrder =
        items.length > 0
          ? Math.max(...items.map((i) => i.sort_order || 0)) + 1
          : 0;
      payload.sort_order = newSortOrder;
    }

    if (currentItem) {
      result = await supabase
        .from(tableName)
        .update(payload)
        .eq("id", currentItem.id); // Menggunakan ID internal Supabase (UUID)
    } else {
      result = await supabase.from(tableName).insert(payload);
    }

    if (result.error) {
      toast.error(`Gagal ${currentItem ? "mengedit" : "menambah"}!`);
      console.error(result.error);
    } else {
      toast.success(
        `${currentView} berhasil ${currentItem ? "diedit" : "ditambah"}!`
      );
      handleCloseModal();
      fetchItems();
    }
  };

  const handleDelete = async (id) => {
    if (
      window.confirm(
        "Yakin ingin menghapus item ini? Ini akan menghapus semua data yang bergantung pada item ini!"
      )
    ) {
      const tableName =
        currentView === "domains"
          ? "activity_domains"
          : currentView === "types"
          ? "activity_types"
          : "activity_tags";
      const { error } = await supabase.from(tableName).delete().eq("id", id);
      if (error) {
        toast.error(
          "Gagal menghapus! Pastikan tidak ada data log yang merujuk."
        );
        console.error(error);
      } else {
        toast.success("Item berhasil dihapus!");
        fetchItems();
      }
    }
  };

  const handleMoveItem = async (itemId, direction) => {
    const tableName =
      currentView === "domains"
        ? "activity_domains"
        : currentView === "types"
        ? "activity_types"
        : "activity_tags";

    const currentItem = items.find((item) => item.id === itemId);
    const currentIndex = items.findIndex((item) => item.id === itemId);
    if (!currentItem) return;

    let newIndex;
    if (direction === "up" && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === "down" && currentIndex < items.length - 1) {
      newIndex = currentIndex + 1;
    } else {
      return;
    }

    const itemToSwap = items[newIndex];
    if (!itemToSwap) return;

    // Lakukan swap sort_order
    const { error: error1 } = await supabase
      .from(tableName)
      .update({ sort_order: itemToSwap.sort_order })
      .eq("id", currentItem.id);

    const { error: error2 } = await supabase
      .from(tableName)
      .update({ sort_order: currentItem.sort_order })
      .eq("id", itemToSwap.id);

    if (error1 || error2) {
      toast.error("Gagal mengurutkan!");
      console.error(error1 || error2);
      return;
    }

    toast.success("Urutan berhasil diubah!");
    fetchItems();
  };

  const getTableHeaders = () => {
    if (currentView === "domains") {
      return ["Urutan", "Nama Domain", "ID Domain", "Published"];
    } else if (currentView === "types") {
      return [
        "Urutan",
        "Nama Tipe Aktivitas",
        "ID Tipe",
        "Domain Induk",
        "Published",
      ];
    } else if (currentView === "tags") {
      return [
        "Urutan",
        "Nama Tag Aktivitas",
        "ID Tag",
        "Tipe Aktivitas",
        "Domain Induk",
        "Published",
      ];
    }
    return [];
  };

  const getTableRows = () => {
    return items.map((item, index) => {
      const row = [];
      const publishedBadge = (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${
            item.is_published ? "bg-green-500" : "bg-gray-400"
          }`}
        >
          {item.is_published ? "Published" : "Draft"}
        </span>
      );

      // Kolom untuk Sort Order (Urutan)
      const sortableCell = (
        <div className="flex items-center space-x-2">
          <div className="flex gap-2 items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMoveItem(item.id, "up");
              }}
              disabled={index === 0}
              className="text-gray-500 hover:text-blue-500 disabled:text-gray-300"
            >
              <ChevronUp size={16} />
            </button>
            <span className="font-bold">{index + 1}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMoveItem(item.id, "down");
              }}
              disabled={index === items.length - 1}
              className="text-gray-500 hover:text-blue-500 disabled:text-gray-300"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      );

      if (currentView === "domains") {
        row.push(
          sortableCell,
          item.name, // Menggunakan kolom 'name'
          item.domain_id,
          publishedBadge
        );
      } else if (currentView === "types") {
        row.push(
          sortableCell,
          item.name, // Menggunakan kolom 'name'
          item.type_id,
          item.domain?.name || "-",
          publishedBadge
        );
      } else if (currentView === "tags") {
        row.push(
          sortableCell,
          item.name, // Menggunakan kolom 'name'
          item.tag_id,
          item.type?.name || "-",
          item.type?.domain?.name || "-",
          publishedBadge
        );
      }
      return row;
    });
  };

  // Logika untuk "Drill Down" (masuk ke level berikutnya)
  const handleDrillDown = (item) => {
    if (currentView === "domains") {
      setSelectedDomain(item);
      setCurrentView("types");
      setSelectedType(null); // Reset level di bawahnya
    } else if (currentView === "types") {
      setSelectedType(item);
      setCurrentView("tags");
    }
  };

  // Logika untuk "Drill Up" (kembali ke level atas)
  const handleDrillUp = (view) => {
    if (view === "types") {
      setCurrentView("types");
      setSelectedType(null);
    } else if (view === "domains") {
      setCurrentView("domains");
      setSelectedDomain(null);
      setSelectedType(null);
    }
  };

  // Field Form Modal disesuaikan
  const getFormFields = () => {
    const baseFields = [];
    if (currentView === "domains") {
      baseFields.push(
        { name: "name", label: "Nama Domain", type: "text" },
        { name: "description", label: "Deskripsi (Opsional)", type: "textarea" }
      );
    } else if (currentView === "types") {
      baseFields.push({
        name: "name",
        label: "Nama Tipe Aktivitas",
        type: "text",
      });
    } else if (currentView === "tags") {
      baseFields.push({
        name: "name",
        label: "Nama Tag Aktivitas",
        type: "text",
      });
    }
    baseFields.push({
      name: "is_published",
      label: "Published",
      type: "checkbox",
    });
    return baseFields;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster />
      <div className="mb-6">
        {/* Breadcrumb yang disesuaikan */}
        <div className="flex items-center gap-2 text-gray-500">
          <Link to="/admin" className="text-gray-500 hover:text-gray-700">
            Admin
          </Link>
          <ChevronRight size={16} />
          <button
            onClick={() => handleDrillUp("domains")}
            className="text-gray-500 hover:text-gray-700 font-medium"
          >
            Domain
          </button>
          {selectedDomain && (
            <>
              <ChevronRight size={16} />
              <button
                onClick={() => handleDrillUp("types")}
                className="text-gray-500 hover:text-gray-700 font-medium"
              >
                {selectedDomain.name}
              </button>
            </>
          )}
          {selectedType && (
            <>
              <ChevronRight size={16} />
              <span className="text-gray-900 font-medium">
                {selectedType.name}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-gray-800">
            {currentView === "domains" && "Kelola Domain Aktivitas"}
            {currentView === "types" &&
              `Tipe Aktivitas di Domain: ${selectedDomain?.name || ""}`}
            {currentView === "tags" &&
              `Tag Aktivitas di Tipe: ${selectedType?.name || ""}`}
          </h2>
          <button
            onClick={() => handleOpenModal()}
            className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            + Tambah
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-lg">Memuat data...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow-md">
          <table className="min-w-full divide-y divide-gray-200 bg-white">
            <thead className="bg-gray-50">
              <tr>
                {getTableHeaders().map((header) => (
                  <th
                    key={header}
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    {header}
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  className="cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  {getTableRows()[index].map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      onClick={() => handleDrillDown(item)}
                      className="whitespace-nowrap px-6 py-4 text-sm text-gray-900"
                    >
                      {cell}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal(item);
                      }}
                      className="text-yellow-600 hover:text-yellow-900"
                    >
                      <Edit size={20} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="ml-4 text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tambah/Edit Item */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-bold">
                {currentItem ? "Edit" : "Tambah"} {currentView}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Field Induk Tampilan (Hanya untuk Type dan Tag) */}
              {currentView === "types" && selectedDomain && (
                <div className="p-3 bg-gray-100 rounded-md">
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Domain Induk
                  </label>
                  <input
                    type="text"
                    value={selectedDomain.name}
                    disabled
                    className="w-full rounded-md border p-2 bg-white font-semibold"
                  />
                  <input
                    type="hidden"
                    name="domain_id"
                    value={selectedDomain.domain_id}
                  />
                </div>
              )}
              {currentView === "tags" && selectedType && (
                <div className="p-3 bg-gray-100 rounded-md">
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Tipe Aktivitas Induk
                  </label>
                  <input
                    type="text"
                    value={selectedType.name}
                    disabled
                    className="w-full rounded-md border p-2 bg-white font-semibold"
                  />
                  <input
                    type="hidden"
                    name="type_id"
                    value={selectedType.type_id}
                  />
                </div>
              )}

              {/* Field Dinamis (Nama dan Published) */}
              {getFormFields().map((field) => (
                <div key={field.name}>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    {field.label}
                  </label>
                  {field.type === "checkbox" ? (
                    <input
                      type="checkbox"
                      name={field.name}
                      checked={form[field.name] || false}
                      onChange={handleChange}
                      className="form-checkbox h-5 w-5 text-blue-600"
                    />
                  ) : field.type === "textarea" ? (
                    <textarea
                      name={field.name}
                      value={form[field.name] || ""}
                      onChange={handleChange}
                      className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none"
                      rows="2"
                    />
                  ) : (
                    <input
                      type="text"
                      name={field.name}
                      value={form[field.name] || ""}
                      onChange={handleChange}
                      className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none"
                      required={field.name === "name"}
                    />
                  )}
                </div>
              ))}
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-md bg-gray-300 px-4 py-2 hover:bg-gray-400"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityCategoryManager;
