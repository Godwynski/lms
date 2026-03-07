import { Schema, Table, Column, ColumnType } from '@powersync/web';

export const AppSchema = new Schema([
  new Table({
    name: 'borrowing_records',
    columns: [
      new Column({ name: 'book_id', type: ColumnType.TEXT }),
      new Column({ name: 'borrower_id', type: ColumnType.TEXT }),
      new Column({ name: 'borrowed_date', type: ColumnType.TEXT }),
      new Column({ name: 'due_date', type: ColumnType.TEXT }),
      new Column({ name: 'returned_date', type: ColumnType.TEXT }),
      new Column({ name: 'status', type: ColumnType.TEXT }),
      new Column({ name: 'updated_at', type: ColumnType.TEXT })
    ]
  }),
  new Table({
    name: 'profiles',
    columns: [
      new Column({ name: 'email', type: ColumnType.TEXT }),
      new Column({ name: 'created_at', type: ColumnType.TEXT }),
      new Column({ name: 'updated_at', type: ColumnType.TEXT }),
      new Column({ name: 'full_name', type: ColumnType.TEXT }),
      new Column({ name: 'role', type: ColumnType.TEXT }),
      new Column({ name: 'library_card_qr', type: ColumnType.TEXT }),
      new Column({ name: 'student_number', type: ColumnType.TEXT })
    ]
  }),
  new Table({
    name: 'books',
    columns: [
      new Column({ name: 'title', type: ColumnType.TEXT }),
      new Column({ name: 'author', type: ColumnType.TEXT }),
      new Column({ name: 'isbn', type: ColumnType.TEXT }),
      new Column({ name: 'created_at', type: ColumnType.TEXT }),
      new Column({ name: 'updated_at', type: ColumnType.TEXT }),
      new Column({ name: 'ddc_call_number', type: ColumnType.TEXT }),
      new Column({ name: 'publisher', type: ColumnType.TEXT }),
      new Column({ name: 'publication_year', type: ColumnType.INTEGER }),
      new Column({ name: 'cover_image_url', type: ColumnType.TEXT }),
      new Column({ name: 'description', type: ColumnType.TEXT }),
      new Column({ name: 'total_copies', type: ColumnType.INTEGER }),
      new Column({ name: 'available_copies', type: ColumnType.INTEGER }),
      new Column({ name: 'genre', type: ColumnType.TEXT }),
      new Column({ name: 'page_count', type: ColumnType.INTEGER }),
      new Column({ name: 'language', type: ColumnType.TEXT }),
      new Column({ name: 'subject', type: ColumnType.TEXT }),
      new Column({ name: 'shelf_location', type: ColumnType.TEXT }),
      new Column({ name: 'category', type: ColumnType.TEXT })
    ]
  }),
  new Table({
    name: 'copies',
    columns: [
      new Column({ name: 'book_id', type: ColumnType.TEXT }),
      new Column({ name: 'barcode_or_qr', type: ColumnType.TEXT }),
      new Column({ name: 'created_at', type: ColumnType.TEXT }),
      new Column({ name: 'updated_at', type: ColumnType.TEXT }),
      new Column({ name: 'status', type: ColumnType.TEXT }),
      new Column({ name: 'condition_notes', type: ColumnType.TEXT })
    ]
  }),
  new Table({
    name: 'audit_logs',
    columns: [
      new Column({ name: 'admin_id', type: ColumnType.TEXT }),
      new Column({ name: 'action', type: ColumnType.TEXT }),
      new Column({ name: 'table_name', type: ColumnType.TEXT }),
      new Column({ name: 'record_id', type: ColumnType.TEXT }),
      new Column({ name: 'old_data', type: ColumnType.TEXT }), // Store as JSON string in SQLite
      new Column({ name: 'new_data', type: ColumnType.TEXT }), // Store as JSON string in SQLite
      new Column({ name: 'created_at', type: ColumnType.TEXT })
    ]
  }),
  new Table({
    name: 'reading_lists',
    columns: [
      new Column({ name: 'user_id', type: ColumnType.TEXT }),
      new Column({ name: 'name', type: ColumnType.TEXT }),
      new Column({ name: 'created_at', type: ColumnType.TEXT }),
      new Column({ name: 'updated_at', type: ColumnType.TEXT })
    ]
  }),
  new Table({
    name: 'reading_list_books',
    columns: [
      new Column({ name: 'list_id', type: ColumnType.TEXT }),
      new Column({ name: 'book_id', type: ColumnType.TEXT }),
      new Column({ name: 'added_at', type: ColumnType.TEXT })
    ]
  }),
  new Table({
    name: 'saved_books',
    columns: [
      new Column({ name: 'user_id', type: ColumnType.TEXT }),
      new Column({ name: 'book_id', type: ColumnType.TEXT }),
      new Column({ name: 'created_at', type: ColumnType.TEXT })
    ]
  }),
  new Table({
    name: 'book_reviews',
    columns: [
      new Column({ name: 'book_id', type: ColumnType.TEXT }),
      new Column({ name: 'user_id', type: ColumnType.TEXT }),
      new Column({ name: 'rating', type: ColumnType.INTEGER }),
      new Column({ name: 'review_text', type: ColumnType.TEXT }),
      new Column({ name: 'created_at', type: ColumnType.TEXT }),
      new Column({ name: 'updated_at', type: ColumnType.TEXT })
    ]
  }),
  new Table({
    name: 'theses',
    columns: [
      new Column({ name: 'title', type: ColumnType.TEXT }),
      new Column({ name: 'author', type: ColumnType.TEXT }),
      new Column({ name: 'course', type: ColumnType.TEXT }),
      new Column({ name: 'publication_year', type: ColumnType.INTEGER }),
      new Column({ name: 'abstract', type: ColumnType.TEXT }),
      new Column({ name: 'pdf_url', type: ColumnType.TEXT }),
      new Column({ name: 'created_at', type: ColumnType.TEXT }),
      new Column({ name: 'updated_at', type: ColumnType.TEXT })
    ]
  }),
  new Table({
    name: 'holds',
    columns: [
      new Column({ name: 'borrower_id', type: ColumnType.TEXT }),
      new Column({ name: 'reason', type: ColumnType.TEXT }),
      new Column({ name: 'active', type: ColumnType.INTEGER }), // 0 or 1
      new Column({ name: 'created_at', type: ColumnType.TEXT }),
      new Column({ name: 'resolved_at', type: ColumnType.TEXT })
    ]
  }),
  new Table({
    name: 'fines',
    columns: [
      new Column({ name: 'borrowing_record_id', type: ColumnType.TEXT }),
      new Column({ name: 'amount', type: ColumnType.REAL }),
      new Column({ name: 'status', type: ColumnType.TEXT }),
      new Column({ name: 'created_at', type: ColumnType.TEXT }),
      new Column({ name: 'resolved_at', type: ColumnType.TEXT })
    ]
  })
]);
