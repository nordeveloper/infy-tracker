//listen a event
window.Echo.private(`task-detail`).listen('AddComment', (result) => {
    processAddCommentResponce(result)
}).listen('UpdateComment', (result) => {
    processUpdateCommentResponce(result.id, result.comment)
}).listen('DeleteComment', (result) => {
    processDeleteCommentResponce(result.id, result.task_id)
})

$(function () {
    $('#editAssignTo').select2({
        width: '100%',
        placeholder: 'Select Assignee',
    })
    $('#editProjectId').select2({
        width: '100%',
        placeholder: 'Select Project',
    })
    $('#editAssignee').select2({
        width: '100%',
    })
    $('#editTagIds').select2({
        width: '100%',
        tags: true,
        createTag: function (tag) {
            var found = false
            $('#editTagIds option').each(function () {
                if ($.trim(tag.term).toUpperCase() ===
                    $.trim($(this).text()).toUpperCase()) {
                    found = true
                }
            })
            if (!found) {
                return {
                    id: tag.term,
                    text: tag.term,
                }
            }
        },
    })
    $('#editPriority').select2({
        width: '100%',
        placeholder: 'Select Priority',
    })

    $('#dueDate,#editDueDate').datetimepicker({
        format: 'YYYY-MM-DD',
        useCurrent: false,
        icons: {
            previous: 'icon-arrow-left icons',
            next: 'icon-arrow-right icons',
        },
        sideBySide: true,
        minDate: moment().millisecond(0).second(0).minute(0).hour(0),
    })
    $('[data-toggle="tooltip"]').tooltip()
})

let taskAssignees = []

// open edit user model
$(document).on('click', '.edit-btn', function (event) {
    let id = $(event.currentTarget).data('id')
    var loadingButton = jQuery(this)
    loadingButton.button('loading')
    $.ajax({
        url: taskUrl + id + '/edit',
        type: 'GET',
        success: function (result) {
            if (result.success) {
                let task = result.data.task
                let allTags = result.data.tags
                $('#editTagIds').empty()
                $.each(allTags, function (i, e) {
                    $('#editTagIds').
                        append($('<option>', { value: i, text: e }))
                })

                let desc = $('<div/>').html(task.description).text()
                CKEDITOR.instances.editDesc.setData(desc)
                $('#tagId').val(task.id)
                $('#editTitle').val(task.title)
                $('#editDesc').val(task.description)
                $('#editDueDate').val(task.due_date)
                $('#editProjectId').val(task.project.id).trigger('change')
                $('#editStatus').val(task.status)
                var tagsIds = []
                var userIds = []
                taskAssignees = []
                $(task.tags).each(function (i, e) {
                    tagsIds.push(e.id)
                })
                $(task.task_assignee).each(function (i, e) {
                    userIds.push(e.id)
                    taskAssignees.push(e.id)
                })
                $('#editTagIds').val(tagsIds).trigger('change')

                $('#editAssignee').val(userIds).trigger('change')
                $('#editPriority').val(task.priority).trigger('change')

                setTimeout(function () {
                    $.each(task.task_assignee, function (i, e) {
                        $('#editAssignee option[value=\'' + e.id + '\']').
                            prop('selected', true).
                            trigger('change')
                    })
                    loadingButton.button('reset')
                    $('#EditModal').modal('show')

                }, 1500)
            }
        },
        error: function () {
            loadingButton.button('reset')
        },
    })
})

$(document).on('change', '#editProjectId', function (event) {
    let projectId = $(this).val()
    loadProjectAssignees(projectId, 'editAssignee')
    setTimeout(function () {
        $('#editAssignee').val(taskAssignees).trigger('change')
    }, 1500)
})

function loadProjectAssignees (projectId, selector) {
    let url = usersOfProjects + '?projectIds=' + projectId
    $('#' + selector).empty()
    $('#' + selector).trigger('change')
    $.ajax({
        url: url,
        type: 'GET',
        success: function (result) {
            const users = result.data
            for (const key in users) {
                if (users.hasOwnProperty(key)) {
                    $('#' + selector).
                        append($('<option>', { value: key, text: users[key] }))
                }
            }
        },
    })
}

$('#editForm').submit(function (event) {
    event.preventDefault()
    var loadingButton = jQuery(this).find('#btnTaskEditSave')
    loadingButton.button('loading')
    var id = $('#tagId').val()
    let formdata = $(this).serializeArray()
    let desc = CKEDITOR.instances.editDesc.getData()
    $.each(formdata, function (i, val) {
        if (val.name == 'description') {
            formdata[i].value = desc
        }
    })
    $.ajax({
        url: taskUrl + id,
        type: 'put',
        data: formdata,
        success: function (result) {
            if (result.success) {
                location.reload()
            }
        },
        error: function (result) {
            loadingButton.button('reset')
            printErrorMessage('#editValidationErrorsBox', result)
        },
    })
})

$('#EditModal').on('hidden.bs.modal', function () {
    CKEDITOR.instances.editDesc.setData('')
    resetModalForm('#editForm', '#editValidationErrorsBox')
})

// light box image galary
$(document).on('click', '[data-toggle="lightbox"]', function (event) {
    event.preventDefault()
    $(this).ekkoLightbox()
})

function getRandomString () {
    return Math.random().toString(36).substring(2, 8) +
        Math.random().toString(36).substring(2, 8)
}

//file upload dropzon js
Dropzone.options.dropzone = {
    maxFilesize: 12,
    renameFile: function (file) {
        let dt = new Date()
        let time = dt.getTime()
        let randomString = getRandomString()
        return time + '_' + randomString + file.name
    },
    thumbnailWidth: 125,
    acceptedFiles: 'image/*,.pdf,.doc,.docx,.xls,.xlsx',
    addRemoveLinks: true,
    dictRemoveFile: 'x',
    timeout: 50000,
    init: function () {
        let thisDropzone = this
        $.get(taskUrl + taskId + '/get-attachments', function (data) {
            $.each(data.data, function (key, value) {
                let mockFile = { name: value.name, id: value.id }

                thisDropzone.options.addedfile.call(thisDropzone, mockFile)
                thisDropzone.options.thumbnail.call(thisDropzone, mockFile,
                    value.url)
                thisDropzone.emit('complete', mockFile)
                thisDropzone.emit('thumbnail', mockFile, value.url)
                $('.dz-remove').eq(key).attr('data-file-id', value.id)
                $('.dz-remove').eq(key).attr('data-file-url', value.url)
            })
        })
        this.on('thumbnail', function (file, dataUrl) {
            $(file.previewTemplate).find('.dz-details').css('display', 'none')
            previewFile(file)
            let fileNameExtArr = file.name.split('.')
            let fileName = fileNameExtArr[0]
            let ext = file.name.split('.').pop()
            let previewEle = ''

            if ($.inArray(ext, ['jpg', 'jpeg', 'png']) > -1) {
                previewEle = '<a class="' + fileName +
                    '" data-fancybox="gallery" href="' + dataUrl +
                    '" data-toggle="lightbox" data-gallery="example-gallery"></a>'
                $('.previewEle').append(previewEle)
            }

            file.previewElement.addEventListener('click', function () {
                let fileName = file.previewElement.querySelector(
                    '[data-dz-name]').innerHTML
                let fileExt = fileName.split('.').pop()
                if ($.inArray(fileExt, ['jpg', 'jpeg', 'png']) > -1) {
                    let onlyFileName = fileName.split('.')[0]
                    $('.' + onlyFileName).trigger('click')
                } else {
                    window.open(dataUrl, '_blank')
                }
            })
        })
        this.on('addedfile', function (file) {
            previewFile(file)
        })

        function previewFile (file) {
            let ext = file.name.split('.').pop()
            if (ext == 'pdf') {
                $(file.previewElement).
                    find('.dz-image img').
                    attr('src', '/assets/img/pdf_icon.png')
            } else if (ext.indexOf('doc') != -1 || ext.indexOf('docx') != -1) {
                $(file.previewElement).
                    find('.dz-image img').
                    attr('src', '/assets/img/doc_icon.png')
            } else if (ext.indexOf('xls') != -1 || ext.indexOf('csv') != -1) {
                $(file.previewElement).
                    find('.dz-image img').
                    attr('src', '/assets/img/xls_icon.png')
            }

            $('.dz-image').
                last().
                find('img').
                attr({ width: '100%', height: '100%' })
        }
    },
    processing: function () {
        $('.dz-remove').html('x')
        $('.dz-details').hide()
    },
    removedfile: function (file) {
        let attachmentId = file.previewElement.querySelector('[data-file-id]').
            getAttribute('data-file-id')
        $.ajax({
            headers: {
                'X-CSRF-TOKEN': $('meta[name="_token"]').attr('content'),
            },
            type: 'post',
            url: taskUrl + attachmentId + '/delete-attachment',
            data: { filename: name },
            error: function (e) {
                console.log('error', e)
            },
        })
        let fileRef
        return (fileRef = file.previewElement) != null ?
            fileRef.parentNode.removeChild(file.previewElement) : void 0
    },
    success: function (file, response) {
        let attachment = response.data
        let fileuploded = file.previewElement.querySelector('[data-dz-name]')
        let fileName = attachment.file
        let fileNameExtArr = fileName.split('.')
        let newFileName = fileNameExtArr[0]
        let newFileExt = fileNameExtArr[1]
        let prevFileName = fileuploded.innerHTML.split('.')[0]
        fileuploded.innerHTML = fileName

        $(file.previewTemplate).
            find('.dz-remove').
            attr('data-file-id', attachment.id)
        $(file.previewTemplate).
            find('.dz-remove').
            attr('data-file-url', attachment.file_url)
        if ($.inArray(newFileExt, ['jpg', 'jpge', 'png']) > -1) {
            $('.previewEle').
                find('.' + prevFileName).
                attr('href', attachment.file_url)
            $('.previewEle').
                find('.' + prevFileName).
                attr('class', newFileName)
        } else {
            file.previewElement.addEventListener('click', function () {
                window.open(attachment.file_url, '_blank')
            })
        }
    },
    error: function (file, response) {
        swal('error!', response.message, 'error')
        let fileRef
        return (fileRef = file.previewElement) != null ?
            fileRef.parentNode.removeChild(file.previewElement) : void 0

        return false
    },
}

function addCommentSection (comment) {
    let id = comment.id
    let icons = ''
    if (comment.created_by == authId) {
        icons = '                    <a class="user__icons del-comment d-none" data-id="' +
            id + '"><i class="cui-trash hand-cursor"></i></a>\n' +
            '                    <a class="user__icons edit-comment d-none" data-id="' +
            id + '"><i class="cui-pencil hand-cursor"></i>&nbsp;</a>\n' +
            '                    <a class="user__icons save-comment comment-save-icon-' +
            id + ' d-none" data-id="' + id +
            '"><i class="cui-circle-check text-success font-weight-bold hand-cursor"></i>&nbsp;&nbsp;</a>\n' +
            '                    <a class="user__icons cancel-comment comment-cancel-icon-' +
            id + ' d-none" data-id="' + id +
            '"><i class="fa fa-times hand-cursor"></i>&nbsp;&nbsp;</a>\n'
    }
    return '<div class="comments__information clearfix" id="comment__' + id +
        '">\n' +
        '        <div class="user">\n' +
        '            <img class="user__img" src="' + comment.user_avatar +
        '" alt="User Image">\n' +
        '            <span class="user__username">\n' +
        '                <a>' + comment.created_user.name + '</a>\n' +
        icons +
        '            </span>\n' +
        '            <span class="user__description">just now</span>\n' +
        '        </div>\n' +
        '        <div class="user__comment comment-display comment-display-' +
        id + '" data-id="' + id + '">\n' +
        comment.comment +
        '        </div>\n' +
        '        <div class="user__comment d-none comment-edit comment-edit-' +
        id + '">\n' +
        '           <textarea class="form-control" id="comment-edit-' + id +
        '" rows="4" name="comment">' + comment.comment + '</textarea>\n' +
        '        </div>\n' +
        '    </div>'
}

$('#btnComment').click(function (event) {
    let comment = CKEDITOR.instances.comment.getData()
    if (comment == '' || comment.trim() == '') {
        return false
    }
    let loadingButton = $(this)
    loadingButton.button('loading')
    $.ajax({
        url: baseUrl + 'tasks/' + taskId + '/comments',
        type: 'post',
        data: { 'comment': comment },
        success: function (result) {
            if (result.success) {
                processAddCommentResponce(result.data.comment)
            }
            loadingButton.button('reset')
        },
        error: function (result) {
            loadingButton.button('reset')
            printErrorMessage('#taskValidationErrorsBox', result)
        },
    })
})

$(document).on('click', '.del-comment', function (event) {
    let commentId = $(this).data('id')
    swal({
            title: 'Delete !',
            text: 'Are you sure you want to delete this "Comment" ?',
            type: 'warning',
            showCancelButton: true,
            closeOnConfirm: false,
            showLoaderOnConfirm: true,
            confirmButtonColor: '#5cb85c',
            cancelButtonColor: '#d33',
            cancelButtonText: 'No',
            confirmButtonText: 'Yes',
        },
        function () {
            $.ajax({
                url: baseUrl + 'tasks/' + taskId + '/comments/' + commentId,
                type: 'DELETE',
                success: function (result) {
                    if (result.success) {
                        processDeleteCommentResponce(commentId, taskId)
                    }
                    swal({
                        title: 'Deleted!',
                        text: 'Comment has been deleted.',
                        type: 'success',
                        timer: 2000,
                    })
                },
                error: function (data) {
                    swal({
                        title: '',
                        text: data.responseJSON.message,
                        type: 'error',
                        timer: 5000,
                    })
                },
            })
        })
})

function processAddCommentResponce (result) {
    let commentDiv = addCommentSection(result)
    $('.comments').append(commentDiv)
    CKEDITOR.instances.comment.setData('')
    $('.no_comments').hide()
}

function processDeleteCommentResponce (commentId, taskId) {
    let commetDiv = 'comment__' + commentId
    $('#' + commetDiv).remove()

    $.ajax({
        url: baseUrl + 'tasks/' + taskId + '/comments-count',
        type: 'GET',
        success: function (result) {
            if (result.data == 0) {
                $('.no_comments').show()
                $('.no_comments').removeClass('d-none')
            }
        },
    })
}

function processUpdateCommentResponce (commentId, comment) {
    $('.comment-display-' + commentId).html(comment).removeClass('d-none')
    $('.comment-edit-' + commentId).addClass('d-none')
    $('.comment-save-icon-' + commentId).addClass('d-none')
    $('.comment-cancel-icon-' + commentId).addClass('d-none')
}

$(document).on('click', '.comment-display,.edit-comment', function () {
    let commentId = $(this).data('id')
    let commentClass = 'comment-edit-' + commentId
    $('.comment-display-' + commentId).addClass('d-none')

    if (!CKEDITOR.instances[commentClass]) {
        CKEDITOR.replace(commentClass, {
            language: 'en',
            height: '100px',
        })
    }

    $('.comment-edit-' + commentId).removeClass('d-none')
    $('.comment-save-icon-' + commentId).removeClass('d-none')
    $('.comment-cancel-icon-' + commentId).removeClass('d-none')
})

$(document).on('click', '.cancel-comment', function (event) {
    let commentId = $(this).data('id')
    $(this).addClass('d-none')
    $('.comment-display-' + commentId).removeClass('d-none')
    $('.comment-edit-' + commentId).addClass('d-none')
    $('.comment-save-icon-' + commentId).addClass('d-none')
})

$(document).on('click', '.save-comment', function (event) {
    let commentId = $(this).data('id')
    let commentClass = 'comment-edit-' + commentId
    let comment = CKEDITOR.instances[commentClass].getData()
    if (comment == '' || comment.trim() == '') {
        return false
    }
    $.ajax({
        url: baseUrl + 'tasks/' + taskId + '/comments/' + commentId + '/update',
        type: 'post',
        data: { 'comment': comment.trim() },
        success: function (result) {
            if (result.success) {
                processUpdateCommentResponce(commentId, comment)
            }
        },
        error: function (result) {
            printErrorMessage('#taskValidationErrorsBox', result)
        },
    })
})

$(document).on('mouseenter', '.comments__information', function () {
    $(this).find('.del-comment').removeClass('d-none')
    $(this).find('.edit-comment').removeClass('d-none')
})

$(document).on('mouseleave', '.comments__information', function () {
    $(this).find('.del-comment').addClass('d-none')
    $(this).find('.edit-comment').addClass('d-none')
})

CKEDITOR.replace('comment', {
    language: 'en',
    height: '150px',
})

CKEDITOR.replace('editDesc', {
    language: 'en',
    height: '150px',
})

$(document).on('click', '#btnCancel', function () {
    CKEDITOR.instances.comment.setData('')
})

//modal not closed on click outside
$('.modal').modal({ show: false, backdrop: 'static' })
