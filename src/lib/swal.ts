import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

// Create a pre-configured instance for consistent styling across the app
export const AppSwal = MySwal.mixin({
  customClass: {
    confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors mx-2 font-medium',
    cancelButton: 'bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors mx-2 font-medium',
    denyButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors mx-2 font-medium',
    popup: 'rounded-xl shadow-xl border border-gray-100',
    title: 'text-xl font-semibold text-gray-800',
  },
  buttonsStyling: false,
  showClass: {
    popup: 'animate__animated animate__fadeIn animate__faster'
  },
  hideClass: {
    popup: 'animate__animated animate__fadeOut animate__faster'
  }
})

export const ConfirmDelete = async (itemName: string = 'this item') => {
  return AppSwal.fire({
    title: 'Are you sure?',
    text: `You are about to delete ${itemName}. This action cannot be undone.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete it!',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#ef4444', // Red-500
    customClass: {
      confirmButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors mx-2 font-medium',
      cancelButton: 'bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors mx-2 font-medium',
      popup: 'rounded-xl shadow-xl border border-gray-100',
    }
  })
}

export const ConfirmAction = async (title: string, text: string, confirmText: string = 'Yes, proceed') => {
  return AppSwal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancel'
  })
}

export const SuccessAlert = (title: string, text?: string) => {
  return AppSwal.fire({
    title,
    text,
    icon: 'success',
    timer: 2000,
    showConfirmButton: false
  })
}

export const ErrorAlert = (title: string, text?: string) => {
  return AppSwal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonText: 'OK'
  })
}
